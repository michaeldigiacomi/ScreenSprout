const { newDb, DataType } = require('pg-mem');

const db = newDb();

// Register generic UUID function
db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => '123e4567-e89b-12d3-a456-426614174000',
});

db.public.query('CREATE TABLE test (id UUID PRIMARY KEY, data JSONB, tags TEXT[]);');

try {
    // Test bind params
    db.public.query('INSERT INTO test (id, data, tags) VALUES (, , )', [
        '123e4567-e89b-12d3-a456-426614174000',
        { foo: 'bar' },
        ['a', 'b']
    ]);
    console.log('Insert success');
    
    const res = db.public.query('SELECT * FROM test WHERE id = ', ['123e4567-e89b-12d3-a456-426614174000']);
    console.log('Select success', res.rows);
} catch (e) {
    console.error('Error:', e.message);
}
