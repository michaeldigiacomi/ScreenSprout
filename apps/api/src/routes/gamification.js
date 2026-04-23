/**
 * Gamification Routes (Goals, Rewards, Points)
 */

const express = require('express');
const { authenticateToken, verifyChildOwnership } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// ============================================
// GOALS
// ============================================

// Get all goals for a child (with today's progress)
router.get('/goals', authenticateToken, async (req, res) => {
    const { childId } = req.query;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        // Get all goals for the child
        const goalsResult = await pool.query(
            `SELECT g.*, 
              gp.id as progress_id, gp.current_value, gp.target_value as progress_target, 
              gp.is_completed, gp.points_earned, gp.date as progress_date
       FROM goals g
       LEFT JOIN goal_progress gp ON g.id = gp.goal_id AND gp.date = CURRENT_DATE
       WHERE g.child_id = $1 AND g.is_active = true
       ORDER BY g.created_at DESC`,
            [childId]
        );

        // Format the response with today's progress
        const goals = goalsResult.rows.map(goal => ({
            id: goal.id,
            child_id: goal.child_id,
            name: goal.name,
            description: goal.description,
            goal_type: goal.goal_type,
            target_value: goal.target_value,
            target_app: goal.target_app,
            points_reward: goal.points_reward,
            is_active: goal.is_active,
            today_progress: goal.progress_id ? {
                current_value: goal.current_value || 0,
                target_value: goal.progress_target || goal.target_value,
                is_completed: goal.is_completed || false,
                points_earned: goal.points_earned || 0
            } : null
        }));

        res.json(goals);
    } catch (err) {
        console.error('[Goals] Error fetching goals:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new goal
router.post('/goals', authenticateToken, csrfProtection, async (req, res) => {
    const { childId, name, description, goalType, targetValue, targetApp, pointsReward } = req.body;
    const pool = req.app.get('db');

    if (!childId || !name || !goalType || !targetValue) {
        return res.status(400).json({ error: 'Missing required fields: childId, name, goalType, targetValue' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `INSERT INTO goals (child_id, user_id, name, description, goal_type, target_value, target_app, points_reward)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [childId, req.user.id, name, description || '', goalType, targetValue, targetApp || null, pointsReward || 10]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Goals] Error creating goal:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a goal
router.delete('/goals/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership through user_id
        const checkResult = await pool.query(
            'SELECT 1 FROM goals WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await pool.query('DELETE FROM goals WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Goals] Error deleting goal:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// REWARDS
// ============================================

// Get all rewards for a child
router.get('/rewards', authenticateToken, async (req, res) => {
    const { childId } = req.query;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `SELECT * FROM rewards 
       WHERE child_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
            [childId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('[Rewards] Error fetching rewards:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new reward
router.post('/rewards', authenticateToken, csrfProtection, async (req, res) => {
    const { childId, name, description, pointsCost, rewardType, rewardValue } = req.body;
    const pool = req.app.get('db');

    if (!childId || !name || !pointsCost) {
        return res.status(400).json({ error: 'Missing required fields: childId, name, pointsCost' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `INSERT INTO rewards (child_id, user_id, name, description, points_cost, reward_type, reward_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [childId, req.user.id, name, description || '', pointsCost, rewardType || 'custom', rewardValue || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Rewards] Error creating reward:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a reward
router.delete('/rewards/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership through user_id
        const checkResult = await pool.query(
            'SELECT 1 FROM rewards WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        await pool.query('DELETE FROM rewards WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Rewards] Error deleting reward:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Redeem a reward
router.post('/rewards/:id/redeem', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { childId } = req.body;
    const pool = req.app.get('db');

    try {
        // Start a transaction
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get reward details
            const rewardResult = await client.query(
                'SELECT * FROM rewards WHERE id = $1 AND user_id = $2',
                [id, req.user.id]
            );

            if (rewardResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Reward not found' });
            }

            const reward = rewardResult.rows[0];

            // Check child's points balance
            const balanceResult = await client.query(
                'SELECT * FROM points_balance WHERE child_id = $1 AND user_id = $2',
                [childId || reward.child_id, req.user.id]
            );

            let balance = balanceResult.rows[0];
            const currentBalance = balance ? balance.current_balance : 0;

            if (currentBalance < reward.points_cost) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient points' });
            }

            // Create redemption record
            const redemptionResult = await client.query(
                `INSERT INTO reward_redemptions (reward_id, child_id, user_id, points_spent, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
                [id, childId || reward.child_id, req.user.id, reward.points_cost]
            );

            // Deduct points
            if (balance) {
                await client.query(
                    `UPDATE points_balance 
           SET current_balance = current_balance - $1, 
               total_spent = total_spent + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE child_id = $2`,
                    [reward.points_cost, childId || reward.child_id]
                );
            }

            // Log transaction
            await client.query(
                `INSERT INTO points_transactions (child_id, user_id, transaction_type, amount, description, reference_id)
         VALUES ($1, $2, 'spent', $3, $4, $5)`,
                [childId || reward.child_id, req.user.id, reward.points_cost, `Redeemed: ${reward.name}`, id]
            );

            // Update reward redemption count
            await client.query(
                'UPDATE rewards SET times_redeemed = times_redeemed + 1 WHERE id = $1',
                [id]
            );

            await client.query('COMMIT');
            res.json(redemptionResult.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[Rewards] Error redeeming reward:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get reward redemptions for a child
router.get('/rewards/redemptions', authenticateToken, async (req, res) => {
    const { childId } = req.query;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `SELECT rr.*, r.name as reward_name
       FROM reward_redemptions rr
       JOIN rewards r ON rr.reward_id = r.id
       WHERE rr.child_id = $1
       ORDER BY rr.created_at DESC`,
            [childId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('[Rewards] Error fetching redemptions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// POINTS
// ============================================

// Get points balance and transaction history for a child
router.get('/points', authenticateToken, async (req, res) => {
    const { childId } = req.query;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        // Get or create balance
        let balanceResult = await pool.query(
            'SELECT * FROM points_balance WHERE child_id = $1 AND user_id = $2',
            [childId, req.user.id]
        );

        if (balanceResult.rows.length === 0) {
            // Create initial balance
            balanceResult = await pool.query(
                `INSERT INTO points_balance (child_id, user_id, total_earned, total_spent, current_balance)
         VALUES ($1, $2, 0, 0, 0)
         RETURNING *`,
                [childId, req.user.id]
            );
        }

        // Get recent transactions
        const transactionsResult = await pool.query(
            `SELECT * FROM points_transactions 
       WHERE child_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
            [childId, req.user.id]
        );

        res.json({
            balance: balanceResult.rows[0],
            transactions: transactionsResult.rows
        });
    } catch (err) {
        console.error('[Points] Error fetching points:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// BONUS TIME
// ============================================

// Get available bonus time
router.get('/bonus-time/available', authenticateToken, async (req, res) => {
    const { childId } = req.query;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `SELECT SUM(minutes) as total_minutes, COUNT(*) as grant_count
             FROM bonus_time_grants
             WHERE child_id = $1 AND is_used = false AND (expires_at IS NULL OR expires_at > NOW())`,
            [childId]
        );

        const row = result.rows[0];
        res.json({
            totalMinutes: parseInt(row.total_minutes || 0),
            grantCount: parseInt(row.grant_count || 0)
        });
    } catch (err) {
        console.error('[BonusTime] Error fetching available time:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
