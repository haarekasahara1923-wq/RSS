async function test() {
    const res = await fetch('https://coachpro-six.vercel.app/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tenantId: 'cmunljxc7000004jwo5xs35jb', // same tenant
            name: 'Test Teacher',
            email: 'testteacher@udba.local',
            phone: '9999999999',
            password: 'password123',
            role: 'TEACHER',
            registrationCode: 'UDBA-2024' // Or whatever it takes to bypass? Wait, tenant registration code might be needed?
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test().catch(console.error);
