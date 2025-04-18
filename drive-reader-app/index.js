import Hyperswarm from 'hyperswarm'
import Hyperdrive from 'hyperdrive'
import Localdrive from 'localdrive'
import Corestore from 'corestore'
import debounce from 'debounceify'
import b4a from 'b4a'

const key = process.argv[2];
if(!key) throw new Error('usage: node index.js <key>');

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

const local = new Localdrive('./reader-dir');

const drive = new Hyperdrive(store, b4a.from(key, 'hex'));
await drive.ready();

const mirror = debounce(mirrorDrive);

drive.core.on('append', mirror);

const foundPeers = store.findingPeers();

swarm.join(drive.discoveryKey, { client: true, server: false });
swarm.flush().then(() => foundPeers());

mirror();

async function mirrorDrive(){
    console.log('started mirroring remote drive into \'./reader-dir\'...');
    const mirror = drive.mirror(local);
    await mirror.done();
    console.log('finished mirroring:', mirror.count);
}