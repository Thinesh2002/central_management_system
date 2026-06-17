import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { getStoredUser, storeAuth, clearAuth } from '../services/auth';
import { useNavigate } from 'react-router-dom';

export default function Profile({ onUserUpdated }){
  const stored = getStoredUser();
  const [user, setUser] = useState(stored);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [userId, setUserId] = useState(user?.user_id || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  if (!user) return <p>Loading...</p>;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = { name, email, user_id: userId };
      if (password) payload.password = password;
      const res = await API.put(`/auth/${user.id}`, payload);
      const updated = res.data.user;
      // keep token unchanged; update stored user
      const token = localStorage.getItem('token');
      storeAuth(updated, token);
      setUser(updated);
      setPassword('');
      if (onUserUpdated) onUserUpdated(updated);
      setMsg('Profile updated');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your account? This cannot be undone.')) return;
    try {
      await API.delete(`/auth/${user.id}`);
      clearAuth();
      if (onUserUpdated) onUserUpdated(null);
      navigate('/login');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <h3 className="mb-3">Profile</h3>
      {msg && <div className="alert alert-info">{msg}</div>}

      <form onSubmit={handleUpdate}>
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input className="form-control" value={name} onChange={e=>setName(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label">User ID</label>
          <input className="form-control" value={userId} onChange={e=>setUserId(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label">New Password (leave empty to keep)</label>
          <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>

        <button className="btn btn-primary me-2">Save changes</button>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete account</button>
      </form>

      <hr className="my-4" />
      <div>
        <p><strong>Account info:</strong></p>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  );
}
