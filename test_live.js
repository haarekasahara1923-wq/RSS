async function test() {
    const res = await fetch('https://coachpro-six.vercel.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '7477004474', password: '123456789' })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test().catch(console.error);
