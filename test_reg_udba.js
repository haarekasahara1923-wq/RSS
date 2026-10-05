async function test() {
    const res = await fetch('https://udba-haarekasahara1923-wqs-projects.vercel.app/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tenantId: 'cmunljxc7000004jwo5xs35jb',
            name: 'Test Teacher 2',
            email: 'testteacher2@udba.local',
            phone: '8888888888',
            password: 'password123',
            role: 'TEACHER',
            schoolCode: 'UDBA-2024'
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test().catch(console.error);
