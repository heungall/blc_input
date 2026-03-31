import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { addMember, deactivateMember, moveMember, fetchDashboard } from '../services/api';

export default function MemberManage({ members, setMembers, onClose }) {
  const { user } = useAuth();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [moving, setMoving] = useState(null);
  const [cells, setCells] = useState([]);
  const [allMembers, setAllMembers] = useState({}); // { cellId: [name, ...] }
  const [selectedCell, setSelectedCell] = useState(user.cellId);
  const [addToCell, setAddToCell] = useState(user.cellId);
  const inputRef = useRef(null);

  const isAdmin = user.role === 'admin';

  // admin일 때 전체 셀 + 멤버 목록 로드
  useEffect(() => {
    if (!isAdmin) return;
    fetchDashboard(user.idToken).then(res => {
      if (res.cells) setCells(res.cells);
      if (res.members) {
        const grouped = {};
        res.cells?.forEach(c => { grouped[c.cellId] = []; });
        res.members.filter(m => m.active).forEach(m => {
          if (!grouped[m.cellId]) grouped[m.cellId] = [];
          grouped[m.cellId].push(m.name);
        });
        setAllMembers(grouped);
      }
    }).catch(() => {});
  }, [isAdmin, user.idToken]);

  // 현재 보고 있는 셀의 멤버 목록
  const currentMembers = isAdmin
    ? (allMembers[selectedCell] || [])
    : members;

  // 이동 가능한 셀 (현재 셀 제외)
  const movableCells = cells.filter(c => c.cellId !== selectedCell);

  const cellNameMap = {};
  cells.forEach(c => { cellNameMap[c.cellId] = c.cellName; });

  const handleAdd = async () => {
    const trimmed = newName.trim();
    const targetCell = isAdmin ? addToCell : user.cellId;
    if (!trimmed) return;

    // 해당 셀에 이미 있는지 확인
    const targetMembers = isAdmin ? (allMembers[targetCell] || []) : members;
    if (targetMembers.includes(trimmed)) {
      alert('이미 등록된 멤버입니다.');
      return;
    }

    setAdding(true);
    try {
      await addMember(user.idToken, targetCell, trimmed);
      if (isAdmin) {
        setAllMembers(prev => ({
          ...prev,
          [targetCell]: [...(prev[targetCell] || []), trimmed]
        }));
      }
      if (targetCell === user.cellId) {
        setMembers(prev => [...prev, trimmed]);
      }
      setNewName('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('addMember error:', err);
      alert('멤버 추가에 실패했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = async (name) => {
    const targetCell = isAdmin ? selectedCell : user.cellId;
    if (!confirm(`${name}님을 비활성화하시겠습니까?\n출결 목록에서 제외되며, 기록은 보존됩니다.`)) return;

    setRemoving(name);
    try {
      await deactivateMember(user.idToken, targetCell, name);
      if (isAdmin) {
        setAllMembers(prev => ({
          ...prev,
          [targetCell]: (prev[targetCell] || []).filter(n => n !== name)
        }));
      }
      if (targetCell === user.cellId) {
        setMembers(prev => prev.filter(n => n !== name));
      }
    } catch (err) {
      console.error('deactivateMember error:', err);
      alert('멤버 비활성화에 실패했습니다.');
    } finally {
      setRemoving(null);
    }
  };

  const handleMove = async (name, toCellId) => {
    const fromCell = isAdmin ? selectedCell : user.cellId;
    const targetCell = cells.find(c => c.cellId === toCellId);
    if (!confirm(`${name}님을 ${targetCell?.cellName || toCellId}(으)로 이동하시겠습니까?`)) return;

    setMoving(name);
    try {
      const res = await moveMember(user.idToken, name, fromCell, toCellId);
      if (res.error) {
        alert(res.error);
      } else {
        if (isAdmin) {
          setAllMembers(prev => ({
            ...prev,
            [fromCell]: (prev[fromCell] || []).filter(n => n !== name),
            [toCellId]: [...(prev[toCellId] || []), name]
          }));
        }
        if (fromCell === user.cellId) {
          setMembers(prev => prev.filter(n => n !== name));
        }
      }
    } catch (err) {
      console.error('moveMember error:', err);
      alert('멤버 이동에 실패했습니다.');
    } finally {
      setMoving(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <div className="card">
        <div className="member-manage-header">
          <h2>멤버 관리</h2>
          <button className="member-manage-close" onClick={onClose}>&times;</button>
        </div>

        {/* admin: 셀 선택 */}
        {isAdmin && cells.length > 0 && (
          <div className="mm-cell-filter">
            <select
              className="dash-select"
              value={selectedCell}
              onChange={(e) => setSelectedCell(e.target.value)}
            >
              {cells.map(c => (
                <option key={c.cellId} value={c.cellId}>
                  {c.cellName} ({(allMembers[c.cellId] || []).length}명)
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="card-desc">
          비활성화하면 출결 목록에서 제외됩니다. 기록은 보존됩니다.
        </p>

        <div className="member-manage-list">
          {currentMembers.map(name => (
            <div className="member-manage-item" key={name}>
              <span className="member-manage-name">{name}</span>
              <div className="member-manage-actions">
                {isAdmin && movableCells.length > 0 && (
                  <select
                    className="member-move-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleMove(name, e.target.value);
                    }}
                    disabled={moving === name}
                  >
                    <option value="">{moving === name ? '...' : '이동'}</option>
                    {movableCells.map(c => (
                      <option key={c.cellId} value={c.cellId}>{c.cellName}</option>
                    ))}
                  </select>
                )}
                <button
                  className="member-manage-remove"
                  onClick={() => handleDeactivate(name)}
                  disabled={removing === name}
                >
                  {removing === name ? '...' : '비활성화'}
                </button>
              </div>
            </div>
          ))}
          {currentMembers.length === 0 && (
            <p className="card-desc">등록된 멤버가 없습니다.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2>새 멤버 추가</h2>
        {isAdmin && cells.length > 0 && (
          <div className="mm-add-cell">
            <label className="nm-label">추가할 셀</label>
            <select
              className="dash-select"
              value={addToCell}
              onChange={(e) => setAddToCell(e.target.value)}
            >
              {cells.map(c => (
                <option key={c.cellId} value={c.cellId}>{c.cellName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="name-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="새 멤버 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={adding}
          />
          <button onClick={handleAdd} disabled={adding || !newName.trim()}>
            {adding ? '...' : '추가'}
          </button>
        </div>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onClose}>
          완료
        </button>
      </div>
    </div>
  );
}
