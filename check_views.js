import PocketBase from 'pocketbase';

async function check() {
    const pb = new PocketBase('https://greenroute-pb.fly.dev');
    try {
        const user = await pb.collection('users').getFirstListItem('username="sainte"');
        console.log(`User: ${user.username}`);
        console.log(`Profile Views: ${user.profile_views}`);
    } catch (e) {
        console.error(e);
    }
}

check();
