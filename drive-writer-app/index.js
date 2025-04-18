import Hyperswarm from 'hyperswarm';
import Hyperdrive from 'hyperdrive';
import Localdrive from 'localdrive';
import Corestore from 'corestore';
import debounce from 'debounceify';
import b4a from 'b4a';

const store = new Corestore('./data');
const swarm = new Hyperswarm();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown(){
    console.log('shutting down...');
    try {
        await swarm.destroy();
        await store.close();
        console.log('Shutdown complete.');
        process.exit(1);
    } catch (error) {
        console.error(`Error during shutdown: ${error}`);
        process.exit(0);
    }
}

swarm.on('connection', conn => store.replicate(conn));

const local = new Localdrive('./writer-dir');

const drive = new Hyperdrive(store);
await drive.ready();

const mirror = debounce(mirrorDrive);

const discovery = swarm.join(drive.discoveryKey);
await discovery.flushed();

console.log('drive key:', b4a.toString(drive.key, 'hex'));

process.stdin.setEncoding('utf-8');

process.stdin.on('data', (data) => {
    if(!data.match('\n')) return;
    mirror();
})

process.stdin.resume();

async function mirrorDrive(){
    console.log('started mirroring changes from \'./writer-dir\' into the drive...');
    const mirror = local.mirror(drive);
    await mirror.done();
    console.log('finished mirroring:', mirror.count);
}