import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { addMember, deactivateMember } from '../services/api';

export default function MemberManage({ members, setMembers, onClose }) {
  const { user } = useAuth();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const inputRef = useRef(null);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || members.includes(trimmed)) return;

    setAdding(true);
    try {
      await addMember(user.idToken, user.cellId, trimmed);
      setMembers(prev => [...prev, trimmed]);
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
    if (!confirm(`${name}님을 비활성화하시겠습니까?\n출결 목록에서 제외되며, 기록은 보존됩니다.`)) return;

    setRemoving(name);
    try {
      await deactivateMember(user.idToken, user.cellId, name);
      setMembers(prev => prev.filter(n => n !== name));
    } catch (err) {
      console.error('deactivateMember error:', err);
      alert('멤버 비활성화에 실패했습니다.');
    } finally {
      setRemoving(null);
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
        <p className="card-desc">
          비활성화하면 출결 목록에서 제외됩니다. 기록은 보존됩니다.
        </p>

        <div className="member-manage-list">
          {members.map(name => (
            <div className="member-manage-item" key={name}>
              <span className="member-manage-name">{name}</span>
              <button
                className="member-manage-remove"
                onClick={() => handleDeactivate(name)}
                disabled={removing === name}
              >
                {removing === name ? '...' : '비활성화'}
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="card-desc">등록된 멤버가 없습니다.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2>새 멤버 추가</h2>
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
