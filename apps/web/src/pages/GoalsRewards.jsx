import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { Target, Gift, Star, Plus, Trash2, Edit2, CheckCircle, XCircle, Award, Clock, Smartphone, Calendar } from 'lucide-react';

const GOAL_TYPES = {
  daily_limit: { label: 'Daily Time Limit', icon: Clock, color: '#3b82f6' },
  app_limit: { label: 'App Time Limit', icon: Smartphone, color: '#f59e0b' },
  streak: { label: 'Streak Goal', icon: Calendar, color: '#8b5cf6' }
};

const REWARD_TYPES = {
  custom: { label: 'Custom Reward', icon: Gift },
  screen_time: { label: 'Extra Screen Time', icon: Clock },
  activity: { label: 'Activity', icon: Target }
};

export default function GoalsRewards() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [goals, setGoals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [pointsData, setPointsData] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [activeTab, setActiveTab] = useState('goals');
  const [loading, setLoading] = useState(false);
  const [, setShowGoalModal] = useState(false);
  const [, setShowRewardModal] = useState(false);
  const [, setEditingGoal] = useState(null);
  const [, setEditingReward] = useState(null);
  const [goalForm, setGoalForm] = useState({
    name: '',
    description: '',
    goalType: 'daily_limit',
    targetValue: 60,
    targetApp: '',
    pointsReward: 10
  });
  const [, setRewardForm] = useState({
    name: '',
    description: '',
    pointsCost: 50,
    rewardType: 'custom',
    rewardValue: null
  });

  const loadChildren = useCallback(async () => {
    try {
      const res = await api.get('/children');
      const childrenData = Array.isArray(res.data) ? res.data : (res.data?.children || []);
      setChildren(childrenData);
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedChild]);

  const loadData = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const [goalsRes, rewardsRes, pointsRes, redemptionsRes] = await Promise.all([
        api.get(`/goals?childId=${selectedChild}`),
        api.get(`/rewards?childId=${selectedChild}`),
        api.get(`/points?childId=${selectedChild}`),
        api.get(`/rewards/redemptions?childId=${selectedChild}`)
      ]);
      
      const goalsData = Array.isArray(goalsRes.data) ? goalsRes.data : (goalsRes.data?.goals || []);
      const rewardsData = Array.isArray(rewardsRes.data) ? rewardsRes.data : (rewardsRes.data?.rewards || []);
      const redemptionsData = Array.isArray(redemptionsRes.data) ? redemptionsRes.data : (redemptionsRes.data?.redemptions || []);
      
      setGoals(goalsData);
      setRewards(rewardsData);
      setPointsData(pointsRes.data);
      setRedemptions(redemptionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Note: handleCreateGoal is defined for future use with the goals modal
  // eslint-disable-next-line no-unused-vars
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', {
        childId: selectedChild,
        ...goalForm
      });
      setShowGoalModal(false);
      resetGoalForm();
      loadData();
    } catch {
      alert('Failed to create goal');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      loadData();
    } catch {
      alert('Failed to delete goal');
    }
  };

  const handleDeleteReward = async (id) => {
    if (!confirm('Delete this reward?')) return;
    try {
      await api.delete(`/rewards/${id}`);
      loadData();
    } catch {
      alert('Failed to delete reward');
    }
  };

  const handleRedeemReward = async (rewardId) => {
    if (!confirm('Redeem this reward? Points will be deducted.')) return;
    try {
      await api.post(`/rewards/${rewardId}/redeem`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to redeem reward');
    }
  };

  const resetGoalForm = () => {
    setGoalForm({
      name: '',
      description: '',
      goalType: 'daily_limit',
      targetValue: 60,
      targetApp: '',
      pointsReward: 10
    });
  };

  const resetRewardForm = () => {
    setRewardForm({
      name: '',
      description: '',
      pointsCost: 50,
      rewardType: 'custom',
      rewardValue: null
    });
  };

  const getProgressPercent = (current, target) => {
    if (target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getSelectedChildName = () => {
    return children.find(c => c.id === selectedChild)?.name || '';
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      <div className="container animate-fade-in">
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h1 style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            margin: 0
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Award size={24} />
            </div>
            Goals & Rewards
          </h1>
          
          <select
            value={selectedChild || ''}
            onChange={e => setSelectedChild(e.target.value)}
            style={{ width: 'auto', minWidth: '200px', margin: 0 }}
          >
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
        </div>

        {/* Points Balance Card */}
        {pointsData && (
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)', 
            color: 'white',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '50%', 
                  width: '80px', 
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Star size={40} color="white" />
                </div>
                
                <div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Current Balance</div>
                  <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
                    {pointsData.balance?.current_balance || 0}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>
                    {getSelectedChildName()}'s Points
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Earned</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {pointsData.balance?.total_earned || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Spent</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {pointsData.balance?.total_spent || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setActiveTab('goals')}
            style={{ 
              width: 'auto',
              background: activeTab === 'goals' ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#e5e7eb',
              color: activeTab === 'goals' ? 'white' : '#374151'
            }}
          >
            <Target size={16} /> Goals
          </button>
          <button 
            onClick={() => setActiveTab('rewards')}
            style={{ 
              width: 'auto',
              background: activeTab === 'rewards' ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#e5e7eb',
              color: activeTab === 'rewards' ? 'white' : '#374151'
            }}
          >
            <Gift size={16} /> Rewards
          </button>
          <button 
            onClick={() => setActiveTab('redemptions')}
            style={{ 
              width: 'auto',
              background: activeTab === 'redemptions' ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#e5e7eb',
              color: activeTab === 'redemptions' ? 'white' : '#374151'
            }}
          >
            Redemptions
          </button>
        </div>

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button 
                onClick={() => { setEditingGoal(null); resetGoalForm(); setShowGoalModal(true); }} 
                style={{ width: 'auto' }}
              >
                <Plus size={16} /> Add Goal
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {goals.map((goal, index) => {
                const typeInfo = GOAL_TYPES[goal.goal_type];
                const Icon = typeInfo.icon;
                const todayProgress = goal.today_progress || {};
                const progressPercent = getProgressPercent(todayProgress.current_value, todayProgress.target_value);
                
                return (
                  <div 
                    key={goal.id} 
                    className="card animate-slide-up"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      opacity: goal.is_active ? 1 : 0.6,
                      borderLeft: `4px solid ${typeInfo.color}`
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '15px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          background: typeInfo.color, 
                          borderRadius: '10px', 
                          padding: '10px',
                          color: 'white'
                        }}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0' }}>{goal.name}</h3>
                          <span className="badge badge-info" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {typeInfo.label}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => { setEditingGoal(goal); setGoalForm({ ...goal }); setShowGoalModal(true); }}
                          className="btn-secondary"
                          style={{ padding: '6px', width: 'auto' }}
                        >
                          <Edit2 size={16} color="#6b7280" />
                        </button>
                        <button 
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="btn-danger"
                          style={{ padding: '6px', width: 'auto' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {goal.description && (
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: '10px 0' }}>{goal.description}</p>
                    )}

                    <div style={{ marginTop: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#374151' }}>
                          Target: {goal.target_value} {goal.goal_type === 'app_limit' ? `min ${goal.target_app ? `(${goal.target_app})` : ''}` : 'min'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563EB' }}>
                          +{goal.points_reward} pts
                        </span>
                      </div>

                      {todayProgress.is_completed !== undefined && (
                        <>
                          <div style={{ 
                            height: '8px', 
                            background: '#e5e7eb', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${progressPercent}%`,
                              background: todayProgress.is_completed ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : typeInfo.color,
                              borderRadius: '4px',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {todayProgress.current_value || 0} / {todayProgress.target_value} min
                            </span>
                            
                            {todayProgress.is_completed ? (
                              <span style={{ fontSize: '12px', color: '#14B8A6', fontWeight: 'bold' }}>
                                <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Completed!
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {progressPercent}% complete
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {goals.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                <Target size={48} style={{ marginBottom: '20px', opacity: 0.5, color: '#2563EB' }} />
                <h3>No goals yet</h3>
                <p>Create goals to encourage healthy screen time habits!</p>
              </div>
            )}
          </>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button 
                onClick={() => { setEditingReward(null); resetRewardForm(); setShowRewardModal(true); }} 
                style={{ width: 'auto' }}
              >
                <Plus size={16} /> Add Reward
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {rewards.map((reward, index) => {
                const typeInfo = REWARD_TYPES[reward.reward_type];
                const Icon = typeInfo.icon;
                const canAfford = (pointsData?.balance?.current_balance || 0) >= reward.points_cost;
                
                return (
                  <div 
                    key={reward.id} 
                    className="card animate-slide-up"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      opacity: reward.is_active ? 1 : 0.6,
                      border: canAfford ? '2px solid #14B8A6' : '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '15px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          background: '#f0fdfa', 
                          borderRadius: '10px', 
                          padding: '10px',
                          color: '#0d9488'
                        }}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0' }}>{reward.name}</h3>
                          <span className="badge badge-active" style={{ fontSize: '11px' }}>
                            {reward.points_cost} points
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => { setEditingReward(reward); setRewardForm({ ...reward }); setShowRewardModal(true); }}
                          className="btn-secondary"
                          style={{ padding: '6px', width: 'auto' }}
                        >
                          <Edit2 size={16} color="#6b7280" />
                        </button>
                        <button 
                          onClick={() => handleDeleteReward(reward.id)}
                          className="btn-danger"
                          style={{ padding: '6px', width: 'auto' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {reward.description && (
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: '10px 0' }}>{reward.description}</p>
                    )}

                    <div style={{ marginTop: '15px' }}>
                      <button
                        onClick={() => handleRedeemReward(reward.id)}
                        disabled={!canAfford}
                        style={{ 
                          width: '100%',
                          background: canAfford ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#e5e7eb',
                          color: canAfford ? 'white' : '#9ca3af'
                        }}
                      >
                        {canAfford ? 'Redeem Reward' : 'Not Enough Points'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {rewards.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                <Gift size={48} style={{ marginBottom: '20px', opacity: 0.5, color: '#2563EB' }} />
                <h3>No rewards yet</h3>
                <p>Create rewards that kids can work toward!</p>
              </div>
            )}
          </>
        )}

        {/* Redemptions Tab */}
        {activeTab === 'redemptions' && (
          <div className="card">
            <h3>Recent Redemptions</h3>
            
            {redemptions.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
                No redemptions yet
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Reward</th>
                      <th style={{ textAlign: 'center' }}>Points</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.reward_name}</div>
                          {r.notes && <div style={{ fontSize: '12px', color: '#6b7280' }}>{r.notes}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.points_spent}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge badge-${r.status === 'approved' ? 'active' : r.status === 'denied' ? 'error' : 'warning'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
