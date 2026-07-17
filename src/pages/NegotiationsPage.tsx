import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { NegotiationsView } from '../components/negotiation/NegotiationsView';

export const NegotiationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/negotiations' } });
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-hero card">
          <div>
            <p className="account-kicker">Customer Space</p>
            <h1>Negotiations</h1>
            <p className="muted">
              Manage your bulk offers and custom production requests. Continue active discussions, accept
              quotes, or generate a payment link.
            </p>
          </div>
        </div>

        <div className="account-layout" style={{ gridTemplateColumns: '1fr' }}>
          <section className="card account-content">
            <NegotiationsView />
          </section>
        </div>
      </div>
    </div>
  );
};