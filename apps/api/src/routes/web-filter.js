/**
 * Web Filter Routes
 */

const express = require('express');
const { authenticateToken, verifyChildOwnership } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// ============================================
// Rules
// ============================================

// List rules for a child (query: childId) or all rules for user
router.get('/rules', authenticateToken, async (req, res) => {
    const { childId } = req.query;
    const pool = req.app.get('db');

    try {
        if (childId) {
            const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
            if (!isOwner) {
                return res.status(404).json({ error: 'Child not found' });
            }

            const result = await pool.query(
                'SELECT * FROM web_filter_rules WHERE child_id = $1 AND user_id = $2 ORDER BY created_at DESC',
                [childId, req.user.id]
            );
            return res.json(result.rows);
        }

        // No childId — return all rules for the user
        const result = await pool.query(
            'SELECT * FROM web_filter_rules WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[WebFilter] Error fetching rules:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a rule
router.post('/rules', authenticateToken, csrfProtection, async (req, res) => {
    const { childId, rule_type, target, target_type, category, applies_to_all, description } = req.body;
    const pool = req.app.get('db');

    if (!childId || !rule_type || !target || !target_type) {
        return res.status(400).json({ error: 'Missing required fields: childId, rule_type, target, target_type' });
    }

    const validRuleTypes = ['block', 'allow', 'category_block'];
    if (!validRuleTypes.includes(rule_type)) {
        return res.status(400).json({ error: `rule_type must be one of: ${validRuleTypes.join(', ')}` });
    }

    const validTargetTypes = ['domain', 'pattern', 'category'];
    if (!validTargetTypes.includes(target_type)) {
        return res.status(400).json({ error: `target_type must be one of: ${validTargetTypes.join(', ')}` });
    }

    try {
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `INSERT INTO web_filter_rules (user_id, child_id, rule_type, target, target_type, category, applies_to_all, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [req.user.id, childId, rule_type, target, target_type, category || null, applies_to_all || false, description || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[WebFilter] Error creating rule:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a rule
router.put('/rules/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const { rule_type, target, target_type, category, is_active, applies_to_all, description } = req.body;
    const pool = req.app.get('db');

    if (rule_type) {
        const validRuleTypes = ['block', 'allow', 'category_block'];
        if (!validRuleTypes.includes(rule_type)) {
            return res.status(400).json({ error: `rule_type must be one of: ${validRuleTypes.join(', ')}` });
        }
    }

    if (target_type) {
        const validTargetTypes = ['domain', 'pattern', 'category'];
        if (!validTargetTypes.includes(target_type)) {
            return res.status(400).json({ error: `target_type must be one of: ${validTargetTypes.join(', ')}` });
        }
    }

    try {
        const checkResult = await pool.query(
            'SELECT 1 FROM web_filter_rules WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const result = await pool.query(
            `UPDATE web_filter_rules
             SET rule_type = COALESCE($1, rule_type),
                 target = COALESCE($2, target),
                 target_type = COALESCE($3, target_type),
                 category = COALESCE($4, category),
                 is_active = COALESCE($5, is_active),
                 applies_to_all = COALESCE($6, applies_to_all),
                 description = COALESCE($7, description),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 AND user_id = $9
             RETURNING *`,
            [rule_type, target, target_type, category, is_active, applies_to_all, description, id, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[WebFilter] Error updating rule:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a rule
router.delete('/rules/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        const checkResult = await pool.query(
            'SELECT 1 FROM web_filter_rules WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        await pool.query('DELETE FROM web_filter_rules WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[WebFilter] Error deleting rule:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Policies
// ============================================

// Get policy for a child (creates default if not exists)
router.get('/policy/:childId', authenticateToken, async (req, res) => {
    const { childId } = req.params;
    const pool = req.app.get('db');

    try {
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        let result = await pool.query(
            'SELECT * FROM web_filter_policies WHERE child_id = $1 AND user_id = $2',
            [childId, req.user.id]
        );

        if (result.rows.length === 0) {
            // Create default policy
            result = await pool.query(
                `INSERT INTO web_filter_policies (child_id, user_id)
                 VALUES ($1, $2)
                 ON CONFLICT (child_id) DO NOTHING
                 RETURNING *`,
                [childId, req.user.id]
            );

            // If ON CONFLICT resulted in no rows, fetch the existing one
            if (result.rows.length === 0) {
                result = await pool.query(
                    'SELECT * FROM web_filter_policies WHERE child_id = $1',
                    [childId]
                );
            }
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[WebFilter] Error fetching policy:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update policy for a child
router.put('/policy/:childId', authenticateToken, csrfProtection, async (req, res) => {
    const { childId } = req.params;
    const {
        filter_enabled,
        block_adult_content,
        safe_search_enabled,
        blocked_categories,
        default_action,
        enforce_during_schedule_only
    } = req.body;
    const pool = req.app.get('db');

    if (default_action) {
        const validActions = ['allow', 'block'];
        if (!validActions.includes(default_action)) {
            return res.status(400).json({ error: `default_action must be one of: ${validActions.join(', ')}` });
        }
    }

    try {
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `UPDATE web_filter_policies
             SET filter_enabled = COALESCE($1, filter_enabled),
                 block_adult_content = COALESCE($2, block_adult_content),
                 safe_search_enabled = COALESCE($3, safe_search_enabled),
                 blocked_categories = COALESCE($4, blocked_categories),
                 default_action = COALESCE($5, default_action),
                 enforce_during_schedule_only = COALESCE($6, enforce_during_schedule_only),
                 updated_at = CURRENT_TIMESTAMP
             WHERE child_id = $7 AND user_id = $8
             RETURNING *`,
            [filter_enabled, block_adult_content, safe_search_enabled, blocked_categories, default_action, enforce_during_schedule_only, childId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[WebFilter] Error updating policy:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// History
// ============================================

// List browsing history for a child
router.get('/history', authenticateToken, async (req, res) => {
    const { childId, from, to, limit = 50 } = req.query;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        let query = 'SELECT * FROM web_history WHERE child_id = $1';
        const params = [childId];
        let paramIndex = 2;

        if (from) {
            query += ` AND timestamp >= $${paramIndex}`;
            params.push(from);
            paramIndex++;
        }

        if (to) {
            query += ` AND timestamp <= $${paramIndex}`;
            params.push(to);
            paramIndex++;
        }

        query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit, 10));

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[WebFilter] Error fetching history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Categories
// ============================================

// List all category defaults (read-only)
router.get('/categories', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');

    try {
        const result = await pool.query(
            'SELECT * FROM web_category_defaults ORDER BY category_name'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[WebFilter] Error fetching categories:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;