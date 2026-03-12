import PocketBase from 'pocketbase';

async function check() {
    const pb = new PocketBase('https://greenroute-pb.fly.dev');
    try {
        // We can't easily get the schema without being admin, 
        // but we can try to fetch the first user and look at its keys.
        const users = await pb.collection('users').getList(1, 1);
        if (users.items.length > 0) {
            console.log("Available fields on user record:");
            console.log(Object.keys(users.items[0]));
        } else {
            console.log("No users found.");
        }
    } catch (e) {
        console.error(e);
    }
}

check();
