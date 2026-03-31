import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSettings, updateSettings } from '../services/api';
import './Dashboard.css';

// ─── 날짜 유틸 ──────────────────────────────────────────────────────────────

/** 해당 날짜가 속한 주의 월요일을 반환 (월~일 기준) */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 이번 주 월요일 */
function getCurrentWeekMonday() {
  return getMonday(new Date());
}

/** 날짜를 YYYY-MM-DD 문자열로 변환 */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** 최근 N주의 월요일 배열 (최신 → 과거 순) */
function getRecentWeekMondays(n) {
  const mondays = [];
  const current = getCurrentWeekMonday();
  for (let i = 0; i < n; i++) {
    const d = new Date(current);
    d.setDate(d.getDate() - 7 * i);
    mondays.push(d);
  }
  return mondays;
}

/** 날짜 문자열 → 해당 주 월요일 문자열 */
function dateToWeekKey(dateStr) {
  return toDateStr(getMonday(new Date(dateStr)));
}

/** 월요일 Date → 'M/D' 형식 */
function formatWeekLabel(mondayDate) {
  return `${mondayDate.getMonth() + 1}/${mondayDate.getDate()}`;
}

// ─── 사유 분류 ──────────────────────────────────────────────────────────────

const REASON_CATEGORIES = [
  { key: 'work',     label: '회사',   keywords: ['회사', '출장', '야근', '근무', '업무', '일'] },
  { key: 'personal', label: '개인사정', keywords: ['개인', '사정', '경조사', '병원', '아프', '아파', '건강', '몸'] },
  { key: 'travel',   label: '여행',   keywords: ['여행', '휴가', '귀성', '귀향', '해외'] },
];

function categorizeReason(reason) {
  if (!reason || reason === '미입력') return 'other';
  const lower = reason.toLowerCase();
  for (const cat of REASON_CATEGORIES) {
    if (cat.keywords.some(kw => lower.includes(kw))) {
      return cat.key;
    }
  }
  return 'other';
}

// ─── 탭 정의 ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview',  label: '출석 현황' },
  { id: 'pattern',   label: '출석 패턴' },
  { id: 'reasons',   label: '결석 사유' },
  { id: 'alerts',    label: '연속 결석' },
  { id: 'status',    label: '멤버 상황' },
  { id: 'newcomers', label: '새신자' },
  { id: 'settings',  label: '설정' },
];

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function Dashboard({ data, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCell, setSelectedCell] = useState('all');
  const [weekCount, setWeekCount] = useState(4);

  // ── 로딩 상태 ──
  if (!data) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <span>대시보드 데이터를 불러오는 중...</span>
      </div>
    );
  }

  const { cells, members, attendance, submissions, newcomers } = data;

  // ── 에러 가드 ──
  if (!cells || !members || !attendance) {
    return (
      <div>
        <DashHeader onBack={onBack} />
        <div className="dash-error">대시보드 데이터가 올바르지 않습니다.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-wide">
      <DashHeader onBack={onBack} />

      <div className="dash-tabs">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`dash-tab ${activeTab === s.id ? 'active' : ''}`}
            onClick={() => setActiveTab(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewSection
          cells={cells}
          members={members}
          attendance={attendance}
        />
      )}

      {activeTab === 'pattern' && (
        <PatternSection
          cells={cells}
          members={members}
          attendance={attendance}
          selectedCell={selectedCell}
          setSelectedCell={setSelectedCell}
          weekCount={weekCount}
          setWeekCount={setWeekCount}
        />
      )}

      {activeTab === 'reasons' && (
        <ReasonsSection
          attendance={attendance}
          weekCount={weekCount}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsSection
          cells={cells}
          members={members}
          attendance={attendance}
        />
      )}

      {activeTab === 'status' && (
        <StatusSection
          cells={cells}
          members={members}
          submissions={submissions || []}
          selectedCell={selectedCell}
          setSelectedCell={setSelectedCell}
        />
      )}

      {activeTab === 'newcomers' && (
        <NewcomersSection newcomers={newcomers || []} />
      )}

      {activeTab === 'settings' && (
        <SettingsSection />
      )}
    </div>
  );
}

// ─── 헤더 ───────────────────────────────────────────────────────────────────

function DashHeader({ onBack }) {
  return (
    <div className="dash-header">
      <button className="dash-back-btn" onClick={onBack} title="뒤로 가기">
        &#8592;
      </button>
      <div className="dash-header-text">
        <h2>대시보드</h2>
        <p>셀 출석 및 멤버 현황</p>
      </div>
    </div>
  );
}

// ─── [1] 출석 현황 (D-01, D-02) ────────────────────────────────────────────

function OverviewSection({ cells, members, attendance }) {
  const currentWeekKey = toDateStr(getCurrentWeekMonday());

  // 이번 주 출석 데이터
  const weekAttendance = useMemo(() =>
    attendance.filter(a => dateToWeekKey(a.date) === currentWeekKey),
    [attendance, currentWeekKey]
  );

  // 셀별 통계 계산
  const cellStats = useMemo(() => {
    return cells.map(cell => {
      const cellMembers = members.filter(m => m.cellId === cell.cellId && m.active);
      const cellAttendance = weekAttendance.filter(a => a.cellId === cell.cellId);

      // 출석자 수 (중복 제거)
      const presentNames = new Set(
        cellAttendance.filter(a => a.status === '출석').map(a => a.memberName)
      );
      const totalActive = cellMembers.length;
      const presentCount = Math.min(presentNames.size, totalActive);
      const rate = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 0;

      return {
        ...cell,
        total: totalActive,
        present: presentCount,
        rate,
      };
    });
  }, [cells, members, weekAttendance]);

  // 전체 출석률
  const overall = useMemo(() => {
    const totalMembers = cellStats.reduce((s, c) => s + c.total, 0);
    const totalPresent = cellStats.reduce((s, c) => s + c.present, 0);
    const rate = totalMembers > 0 ? Math.round((totalPresent / totalMembers) * 100) : 0;
    return { total: totalMembers, present: totalPresent, rate };
  }, [cellStats]);

  const currentMonday = getCurrentWeekMonday();
  const weekLabel = `${currentMonday.getMonth() + 1}/${currentMonday.getDate()} ~ ${currentMonday.getMonth() + 1}/${currentMonday.getDate() + 6}`;

  return (
    <>
      {/* 전체 출석률 */}
      <div className="dash-overall-card">
        <div className="dash-overall-label">이번 주 전체 출석률</div>
        <div className="dash-overall-rate">{overall.rate}%</div>
        <div className="dash-overall-detail">
          {overall.present}명 출석 / {overall.total}명
        </div>
        <div className="dash-week-label">{weekLabel}</div>
      </div>

      {/* 셀별 출석률 */}
      <div className="dash-section">
        <h3>셀별 출석률</h3>
        {cellStats.length === 0 ? (
          <div className="dash-no-data">등록된 셀이 없습니다.</div>
        ) : (
          <div className="dash-cell-grid">
            {cellStats.map(cell => {
              const level = cell.rate >= 80 ? 'high' : cell.rate >= 50 ? 'mid' : 'low';
              return (
                <div key={cell.cellId} className="dash-cell-card">
                  <div className={`dash-cell-rate-circle ${level}`}>
                    {cell.rate}%
                  </div>
                  <div className="dash-cell-info">
                    <div className="dash-cell-name">{cell.cellName}</div>
                    <div className="dash-cell-bar-bg">
                      <div
                        className={`dash-cell-bar-fill ${level}`}
                        style={{ width: `${cell.rate}%` }}
                      />
                    </div>
                    <div className="dash-cell-detail">
                      {cell.present}명 출석 / {cell.total}명
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── [2] 멤버별 출석 패턴 (D-03) ───────────────────────────────────────────

function PatternSection({ cells, members, attendance, selectedCell, setSelectedCell, weekCount, setWeekCount }) {
  const recentMondays = useMemo(() => getRecentWeekMondays(weekCount), [weekCount]);

  // 출석 데이터를 weekKey + cellId + memberName 으로 인덱싱
  const attendanceIndex = useMemo(() => {
    const idx = {};
    attendance.forEach(a => {
      const wk = dateToWeekKey(a.date);
      const key = `${wk}|${a.cellId}|${a.memberName}`;
      idx[key] = a.status;
    });
    return idx;
  }, [attendance]);

  // 필터된 멤버
  const filteredMembers = useMemo(() => {
    if (selectedCell === 'all') return members.filter(m => m.active);
    return members.filter(m => m.cellId === selectedCell && m.active);
  }, [members, selectedCell]);

  // 셀 이름 매핑
  const cellNameMap = useMemo(() => {
    const map = {};
    cells.forEach(c => { map[c.cellId] = c.cellName; });
    return map;
  }, [cells]);

  return (
    <div className="dash-section">
      <h3>멤버별 출석 패턴</h3>

      {/* 셀 필터 */}
      <div className="dash-filter">
        <div className="dash-filter-label">셀 선택</div>
        <select
          className="dash-select"
          value={selectedCell}
          onChange={e => setSelectedCell(e.target.value)}
        >
          <option value="all">전체 셀</option>
          {cells.map(c => (
            <option key={c.cellId} value={c.cellId}>{c.cellName}</option>
          ))}
        </select>
      </div>

      {/* N주 설정 */}
      <div className="dash-weeks-control">
        <span className="dash-weeks-label">조회 기간</span>
        <button
          className="dash-weeks-btn"
          onClick={() => setWeekCount(w => Math.max(2, w - 1))}
          disabled={weekCount <= 2}
        >
          -
        </button>
        <span className="dash-weeks-value">{weekCount}주</span>
        <button
          className="dash-weeks-btn"
          onClick={() => setWeekCount(w => Math.min(12, w + 1))}
          disabled={weekCount >= 12}
        >
          +
        </button>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="dash-no-data">해당 셀에 활성 멤버가 없습니다.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dash-pattern-table">
            <thead>
              <tr>
                <th>이름</th>
                {selectedCell === 'all' && <th>셀</th>}
                {recentMondays.map(m => (
                  <th key={toDateStr(m)}>{formatWeekLabel(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => (
                <tr key={`${member.cellId}-${member.name}`}>
                  <td>{member.name}</td>
                  {selectedCell === 'all' && (
                    <td style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                      {cellNameMap[member.cellId] || ''}
                    </td>
                  )}
                  {recentMondays.map(monday => {
                    const wk = toDateStr(monday);
                    const key = `${wk}|${member.cellId}|${member.name}`;
                    const status = attendanceIndex[key];
                    let symbol, className;
                    if (status === '출석') {
                      symbol = 'O';
                      className = 'pattern-present';
                    } else if (status === '결석') {
                      symbol = 'X';
                      className = 'pattern-absent';
                    } else {
                      symbol = '-';
                      className = 'pattern-none';
                    }
                    return (
                      <td key={wk} className={className}>{symbol}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── [3] 결석 사유 분류 (D-04) ──────────────────────────────────────────────

function ReasonsSection({ attendance, weekCount }) {
  const recentMondays = useMemo(() => getRecentWeekMondays(weekCount), [weekCount]);
  const recentWeekKeys = useMemo(
    () => new Set(recentMondays.map(m => toDateStr(m))),
    [recentMondays]
  );

  // 최근 N주 결석 데이터
  const reasonCounts = useMemo(() => {
    const counts = { work: 0, personal: 0, travel: 0, other: 0 };
    attendance.forEach(a => {
      if (a.status !== '결석') return;
      const wk = dateToWeekKey(a.date);
      if (!recentWeekKeys.has(wk)) return;
      const cat = categorizeReason(a.absenceReason);
      counts[cat]++;
    });
    return counts;
  }, [attendance, recentWeekKeys]);

  const totalAbsences = Object.values(reasonCounts).reduce((s, v) => s + v, 0);

  const categories = [
    { key: 'work',     label: '회사',   color: 'work' },
    { key: 'personal', label: '개인사정', color: 'personal' },
    { key: 'travel',   label: '여행',   color: 'travel' },
    { key: 'other',    label: '기타',   color: 'other' },
  ];

  return (
    <div className="dash-section">
      <h3>결석 사유 분류 (최근 {weekCount}주)</h3>

      {totalAbsences === 0 ? (
        <div className="dash-no-data">해당 기간에 결석 기록이 없습니다.</div>
      ) : (
        <div className="dash-reason-chart">
          {categories.map(cat => {
            const count = reasonCounts[cat.key];
            const pct = totalAbsences > 0 ? Math.round((count / totalAbsences) * 100) : 0;
            return (
              <div key={cat.key} className="dash-reason-row">
                <span className="dash-reason-label">{cat.label}</span>
                <div className="dash-reason-bar-bg">
                  <div
                    className={`dash-reason-bar-fill ${cat.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="dash-reason-count">{count}건 ({pct}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── [4] 연속 결석 알림 (D-05) ──────────────────────────────────────────────

function AlertsSection({ cells, members, attendance }) {
  const CONSECUTIVE_THRESHOLD = 2;

  // 셀 이름 매핑
  const cellNameMap = useMemo(() => {
    const map = {};
    cells.forEach(c => { map[c.cellId] = c.cellName; });
    return map;
  }, [cells]);

  // 최근 12주까지 확인 (연속 결석 탐지용)
  const recentMondays = useMemo(() => getRecentWeekMondays(12), []);

  const alerts = useMemo(() => {
    const result = [];
    const activeMembers = members.filter(m => m.active);

    // 출석 인덱스
    const idx = {};
    attendance.forEach(a => {
      const wk = dateToWeekKey(a.date);
      const key = `${wk}|${a.cellId}|${a.memberName}`;
      idx[key] = a.status;
    });

    activeMembers.forEach(member => {
      let consecutive = 0;
      let lastReason = '';

      // 최신 주부터 과거로 탐색
      for (const monday of recentMondays) {
        const wk = toDateStr(monday);
        const key = `${wk}|${member.cellId}|${member.name}`;
        const status = idx[key];

        if (status === '결석') {
          consecutive++;
          // 가장 최근 결석 사유 저장
          if (consecutive === 1) {
            const record = attendance.find(
              a => dateToWeekKey(a.date) === wk && a.cellId === member.cellId && a.memberName === member.name
            );
            lastReason = record?.absenceReason || '';
          }
        } else if (status === '출석') {
          break; // 출석이 나오면 연속 끊김
        } else {
          // 데이터 없음 — 결석으로 간주하지 않고 중단
          break;
        }
      }

      if (consecutive >= CONSECUTIVE_THRESHOLD) {
        result.push({
          name: member.name,
          cellId: member.cellId,
          cellName: cellNameMap[member.cellId] || '',
          weeks: consecutive,
          lastReason,
        });
      }
    });

    // 연속 결석이 많은 순으로 정렬
    result.sort((a, b) => b.weeks - a.weeks);
    return result;
  }, [members, attendance, recentMondays, cellNameMap]);

  return (
    <div className="dash-section">
      <h3>연속 결석 멤버 ({CONSECUTIVE_THRESHOLD}주 이상)</h3>

      {alerts.length === 0 ? (
        <div className="dash-no-data">연속 결석 멤버가 없습니다.</div>
      ) : (
        <div className="dash-alert-list">
          {alerts.map((alert, i) => (
            <div key={`${alert.cellId}-${alert.name}-${i}`} className="dash-alert-item">
              <span className="dash-alert-icon">!</span>
              <div className="dash-alert-content">
                <div className="dash-alert-name">{alert.name}</div>
                <div className="dash-alert-detail">
                  {alert.cellName}
                  {alert.lastReason ? ` / 최근 사유: ${alert.lastReason}` : ''}
                </div>
              </div>
              <span className="dash-alert-weeks">{alert.weeks}주 연속</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── [5] 멤버 상황 요약 (D-06) ──────────────────────────────────────────────

function StatusSection({ cells, members, submissions, selectedCell, setSelectedCell }) {
  // 셀별 최근 제출 데이터에서 나눔/기도제목 추출
  const memberSummaries = useMemo(() => {
    const filteredMembers = selectedCell === 'all'
      ? members.filter(m => m.active)
      : members.filter(m => m.cellId === selectedCell && m.active);

    // submissions에서 멤버별 최근 나눔/기도제목 추출
    // submissions: { date, cellId, cellName, sharing, prayers }
    // sharing/prayers 형식: "이름- 내용\n이름- 내용" 또는 [{name, content}]
    const memberData = {};

    // 날짜 최신순 정렬
    const sorted = [...submissions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sorted.forEach(sub => {
      const parseEntries = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        // 문자열인 경우 "이름- 내용" 형식 파싱
        // [SECURE] 입력값 파싱 시 안전한 split 사용
        return raw.split('\n').map(line => {
          const sepIdx = line.indexOf('-');
          if (sepIdx === -1) return null;
          return {
            name: line.substring(0, sepIdx).trim(),
            content: line.substring(sepIdx + 1).trim(),
          };
        }).filter(Boolean);
      };

      const sharingEntries = parseEntries(sub.sharing);
      const prayerEntries = parseEntries(sub.prayers);

      sharingEntries.forEach(entry => {
        if (!entry.name || !entry.content) return;
        const key = `${sub.cellId}|${entry.name}`;
        if (!memberData[key]) {
          memberData[key] = { cellId: sub.cellId, name: entry.name, sharing: '', prayers: '', date: sub.date };
        }
        if (!memberData[key].sharing) {
          memberData[key].sharing = entry.content;
          memberData[key].date = sub.date;
        }
      });

      prayerEntries.forEach(entry => {
        if (!entry.name || !entry.content) return;
        const key = `${sub.cellId}|${entry.name}`;
        if (!memberData[key]) {
          memberData[key] = { cellId: sub.cellId, name: entry.name, sharing: '', prayers: '', date: sub.date };
        }
        if (!memberData[key].prayers) {
          memberData[key].prayers = entry.content;
        }
      });
    });

    // 셀 이름 매핑
    const cellNameMap = {};
    cells.forEach(c => { cellNameMap[c.cellId] = c.cellName; });

    return filteredMembers.map(member => {
      const key = `${member.cellId}|${member.name}`;
      const data = memberData[key] || {};
      return {
        name: member.name,
        cellId: member.cellId,
        cellName: cellNameMap[member.cellId] || '',
        sharing: data.sharing || '',
        prayers: data.prayers || '',
        date: data.date || '',
      };
    });
  }, [cells, members, submissions, selectedCell]);

  return (
    <div className="dash-section">
      <h3>멤버 상황 요약</h3>

      {/* 셀 필터 */}
      <div className="dash-filter">
        <div className="dash-filter-label">셀 선택</div>
        <select
          className="dash-select"
          value={selectedCell}
          onChange={e => setSelectedCell(e.target.value)}
        >
          <option value="all">전체 셀</option>
          {cells.map(c => (
            <option key={c.cellId} value={c.cellId}>{c.cellName}</option>
          ))}
        </select>
      </div>

      {memberSummaries.length === 0 ? (
        <div className="dash-no-data">해당 셀에 활성 멤버가 없습니다.</div>
      ) : (
        <div className="dash-member-summary-list">
          {memberSummaries.map((member, i) => (
            <div key={`${member.cellId}-${member.name}-${i}`} className="dash-member-summary-item">
              <div className="dash-member-summary-name">
                {member.name}
                {selectedCell === 'all' && (
                  <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 400, marginLeft: '8px' }}>
                    {member.cellName}
                  </span>
                )}
              </div>
              <div className="dash-member-summary-row">
                <span className="dash-member-summary-tag">나눔</span>
                {member.sharing ? (
                  <span className="dash-member-summary-value">{member.sharing}</span>
                ) : (
                  <span className="dash-member-summary-empty">기록 없음</span>
                )}
              </div>
              <div className="dash-member-summary-row">
                <span className="dash-member-summary-tag">기도제목</span>
                {member.prayers ? (
                  <span className="dash-member-summary-value">{member.prayers}</span>
                ) : (
                  <span className="dash-member-summary-empty">기록 없음</span>
                )}
              </div>
              {member.date && (
                <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>
                  최근 기록: {member.date}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── [7] 설정 (표어 등) ────────────────────────────────────────────────────

function SettingsSection() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [motto, setMotto] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setMotto(s.motto || '');
      setYear(s.year || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings(user.idToken, 'motto', motto);
      await updateSettings(user.idToken, 'year', year);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('settings save error:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-section">
      <h3>교회 설정</h3>

      <div className="settings-field">
        <label className="nm-label">연도</label>
        <input
          type="text"
          className="nm-input"
          placeholder="2026"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>

      <div className="settings-field">
        <label className="nm-label">교회 표어</label>
        <textarea
          className="nm-input"
          placeholder="올해의 표어를 입력하세요"
          value={motto}
          onChange={(e) => setMotto(e.target.value)}
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="settings-preview">
        <div className="settings-preview-label">미리보기</div>
        <div className="landing-motto" style={{ margin: 0 }}>
          {year && <span className="landing-motto-year">{year}</span>}
          <p className="landing-motto-text">{motto || '표어를 입력하세요'}</p>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: '16px' }}
      >
        {saving ? '저장 중...' : saved ? '저장 완료!' : '저장'}
      </button>
    </div>
  );
}

// ─── [6] 새신자 현황 ───────────────────────────────────────────────────────

function NewcomersSection({ newcomers }) {
  const sorted = useMemo(() =>
    [...newcomers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [newcomers]
  );

  return (
    <div className="dash-section">
      <h3>새신자 / 방문자 ({newcomers.length}명)</h3>

      {sorted.length === 0 ? (
        <div className="dash-no-data">등록된 새신자가 없습니다.</div>
      ) : (
        <div className="dash-newcomer-list">
          {sorted.map((nc, i) => (
            <div key={`${nc.name}-${nc.date}-${i}`} className="dash-newcomer-item">
              <div className="dash-newcomer-header">
                <span className="dash-newcomer-name">{nc.name}</span>
                <span className="dash-newcomer-date">{nc.date}</span>
              </div>
              <div className="dash-newcomer-tags">
                {nc.visitReason && (
                  <span className="dash-newcomer-tag visit">{nc.visitReason}</span>
                )}
                {nc.visitChannel && (
                  <span className="dash-newcomer-tag channel">{nc.visitChannel}</span>
                )}
                {nc.faith && (
                  <span className="dash-newcomer-tag faith">{nc.faith}</span>
                )}
                {nc.afterPlan && (
                  <span className="dash-newcomer-tag plan">{nc.afterPlan}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
