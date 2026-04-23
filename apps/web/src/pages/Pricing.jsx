import React, { useState } from 'react';
import { Link } from 'lucide-react';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$9.99',
      period: 'per month',
      description: 'Flexible monthly billing',
      features: [
        'Unlimited children profiles',
        'Unlimited devices',
        'Real-time monitoring',
        'Screen time scheduling',
        'App blocking & categories',
        'Activity reports & analytics',
        'Goals & rewards system',
        'Email support'
      ],
      popular: false
    },
    {
      id: 'annual',
      name: 'Annual',
      price: '$99.99',
      period: 'per year',
      description: 'Save ~17% with annual billing',
      features: [
        'Everything in Monthly plan',
        'Priority email support',
        'Early access to new features',
        'Export data to CSV/PDF',
        'Advanced AI insights',
        'Family sharing (up to 2 parents)'
      ],
      popular: true
    }
  ];

  const _selectedPlan = plans.find(p => p.id === billingCycle);

  return (
    <div className="page-container" style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #ffffff 100%)',
      padding: '40px 20px'
    }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ marginBottom: '24px' }}>
            <svg width="64" height="64" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '16px' }}>
              <rect x="4" y="8" width="32" height="22" rx="3" stroke="url(#g)" strokeWidth="2"/>
              <path d="M16 30 L14 34 L26 34 L24 30" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 20 C20 16 16 14 14 16 C14 18 16 22 20 22 C24 22 26 18 26 16 C24 14 20 16 20 20" fill="url(#g)"/>
              <defs>
                <linearGradient id="g" x1="4" y1="8" x2="36" y2="32">
                  <stop offset="0%" stopColor="#2563EB"/>
                  <stop offset="100%" stopColor="#14B8A6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <h1 style={{ 
            fontSize: '42px',
            fontWeight: '800',
            background: 'linear-gradient(to right, #2563EB, #14B8A6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '16px'
          }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '18px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            Choose the plan that works best for your family
          </p>
        </div>

        {/* Billing Toggle */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '40px' 
        }}>
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            borderRadius: '12px',
            padding: '4px'
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                background: billingCycle === 'monthly' ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : 'transparent',
                color: billingCycle === 'monthly' ? 'white' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                background: billingCycle === 'annual' ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : 'transparent',
                color: billingCycle === 'annual' ? 'white' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              Annual
              <span style={{
                marginLeft: '8px',
                fontSize: '11px',
                padding: '2px 8px',
                background: '#f59e0b',
                borderRadius: '10px',
                color: 'white'
              }}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '30px',
          marginBottom: '50px'
        }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="card animate-slide-up"
              style={{
                padding: '40px',
                borderRadius: '20px',
                border: billingCycle === plan.id 
                  ? '2px solid transparent' 
                  : '2px solid #e5e7eb',
                background: billingCycle === plan.id 
                  ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #2563EB, #14B8A6) border-box'
                  : 'white',
                position: 'relative',
                transform: billingCycle === plan.id ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setBillingCycle(plan.id)}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                  background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Best Value
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700',
                  marginBottom: '8px',
                  color: '#111827'
                }}>
                  {plan.name}
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  {plan.description}
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <span style={{
                  fontSize: '48px',
                  fontWeight: '800',
                  background: 'linear-gradient(to right, #2563EB, #14B8A6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {plan.price}
                </span>
                <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                  {plan.period}
                </span>
              </div>

              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: '0 0 30px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {plan.features.map((feature, index) => (
                  <li 
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '15px',
                      color: '#374151'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="url(#checkGradient)"/>
                      <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <defs>
                        <linearGradient id="checkGradient" x1="0" y1="0" x2="20" y2="20">
                          <stop offset="0%" stopColor="#2563EB"/>
                          <stop offset="100%" stopColor="#14B8A6"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: billingCycle === plan.id 
                    ? 'linear-gradient(135deg, #2563EB, #14B8A6)' 
                    : '#f3f4f6',
                  color: billingCycle === plan.id ? 'white' : '#374151',
                  boxShadow: billingCycle === plan.id 
                    ? '0 4px 12px rgba(37, 99, 235, 0.25)' 
                    : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {billingCycle === plan.id ? 'Selected' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)',
          borderRadius: '20px',
          padding: '50px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            Ready to get started?
          </h2>
          <p style={{ 
            fontSize: '16px',
            opacity: 0.9,
            marginBottom: '24px'
          }}>
            Start your free trial today. No credit card required.
          </p>
          <button style={{
            padding: '16px 40px',
            borderRadius: '12px',
            border: 'none',
            background: 'white',
            color: '#2563EB',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            Start Free Trial
          </button>
        </div>

        {/* Trust Badges */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginTop: '40px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔒</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Secure Payment</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>✓</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>30-Day Guarantee</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>✕</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Cancel Anytime</div>
          </div>
        </div>
      </div>
    </div>
  );
}
