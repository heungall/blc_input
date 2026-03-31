import { useState } from 'react';

const HELP_SECTIONS = [
  {
    id: 'leader',
    title: '셀 리더 가이드',
    icon: '&#128221;',
    items: [
      {
        q: '출결 체크는 어떻게 하나요?',
        a: '멤버 이름을 탭하면 출석/결석이 전환됩니다. 결석 시 사유(회사, 개인사정, 여행)를 선택하거나 직접 입력할 수 있습니다.',
      },
      {
        q: '역할 추첨은 어떻게 하나요?',
        a: '출석 멤버 4명 이상일 때 추첨이 가능합니다. 인원에 따라 역할(첫기도, 끝기도, 기도정리, 질문자, 사진사, 인도)이 자동 배정됩니다. 추첨 없이 넘어갈 수도 있습니다.',
      },
      {
        q: '나눔/기도제목 한번에 입력이 뭔가요?',
        a: '카톡 등에서 복사한 내용을 붙여넣으면 멤버 이름을 자동 인식합니다. 이름 뒤 두 글자(별명)도 인식됩니다. 예: "주원 기도제목 내용"',
      },
      {
        q: '제출한 내용을 수정할 수 있나요?',
        a: '같은 주(월~일) 안에서는 언제든 수정 가능합니다. 다시 로그인하면 요약 화면이 뜨고, 원하는 항목만 수정할 수 있습니다.',
      },
      {
        q: '멤버를 추가/삭제하려면?',
        a: '헤더의 톱니바퀴(설정) 버튼 → 멤버 관리에서 추가/비활성화가 가능합니다. 비활성화된 멤버는 출결 목록에서 제외되지만 기록은 보존됩니다.',
      },
    ],
  },
  {
    id: 'newcomer',
    title: '새신자 / 방문자',
    icon: '&#128075;',
    items: [
      {
        q: '방문자 카드는 어떻게 작성하나요?',
        a: '첫 화면에서 "새신자 / 방문자"를 선택하면 방문자 카드 작성 화면이 나옵니다. 로그인 없이 바로 작성 가능합니다.',
      },
      {
        q: '필수 입력 항목은?',
        a: '이름, 휴대폰 번호, 개인정보 수집 동의가 필수입니다. 나머지는 선택사항입니다.',
      },
    ],
  },
  {
    id: 'admin',
    title: '관리자 가이드',
    icon: '&#128202;',
    items: [
      {
        q: '대시보드는 어디서 보나요?',
        a: '관리자(admin) 계정으로 로그인하면 헤더에 대시보드 버튼(☰)이 나타납니다. 출석 현황, 출석 패턴, 결석 사유, 연속 결석, 멤버 상황, 새신자 정보를 확인할 수 있습니다.',
      },
      {
        q: '멤버를 다른 셀로 이동하려면?',
        a: '헤더의 톱니바퀴(설정) → 멤버 관리에서 셀을 선택하고, 멤버 옆 "이동" 드롭다운으로 다른 셀로 이동시킬 수 있습니다. 관리자만 가능합니다.',
      },
      {
        q: '셀 리더를 추가하려면?',
        a: 'Google Sheet의 "셀_리더" 시트에서 직접 추가합니다. cell_id, cell_name, leader_email, role 컬럼을 입력하세요.',
      },
      {
        q: '관리자 권한을 부여하려면?',
        a: '"셀_리더" 시트에서 해당 계정의 role 컬럼을 "admin"으로 변경하세요.',
      },
    ],
  },
];

export default function Help({ onClose, userRole }) {
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => {
    setOpenId(prev => prev === id ? null : id);
  };

  // admin이면 전체, 아니면 리더+새신자만
  const sections = userRole === 'admin'
    ? HELP_SECTIONS
    : HELP_SECTIONS.filter(s => s.id !== 'admin');

  return (
    <div>
      <div className="card">
        <div className="member-manage-header">
          <h2>도움말</h2>
          <button className="member-manage-close" onClick={onClose}>&times;</button>
        </div>
      </div>

      {sections.map(section => (
        <div className="card help-section" key={section.id}>
          <h3 className="help-section-title">
            <span dangerouslySetInnerHTML={{ __html: section.icon }} />{' '}
            {section.title}
          </h3>
          <div className="help-items">
            {section.items.map((item, i) => {
              const itemId = `${section.id}-${i}`;
              const isOpen = openId === itemId;
              return (
                <div key={itemId} className="help-item">
                  <button
                    className={`help-question ${isOpen ? 'open' : ''}`}
                    onClick={() => toggle(itemId)}
                  >
                    <span>{item.q}</span>
                    <span className="help-arrow">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="help-answer">{item.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
