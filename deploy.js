const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// Helper to run commands
function runCommand(command, args, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
        const cmdStr = `${command} ${args.join(' ')}`;
        console.log(`\n> Executing: ${cmdStr}`);
        
        // On Windows, npm needs to be run as npm.cmd, but shell: true handles this mostly
        const child = spawn(command, args, {
            stdio: 'inherit',
            cwd,
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                // git commit returns 1 if nothing to commit, which is fine sometimes
                if (command === 'git' && args.includes('commit')) {
                    resolve(); 
                } else {
                    reject(new Error(`Command "${cmdStr}" failed with code ${code}`));
                }
            }
        });
        
        child.on('error', (err) => {
             reject(err);
        });
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    try {
        console.log('==========================================');
        console.log('       CLMS-JS Auto Build & Deploy');
        console.log('==========================================');

        // 1. Build Frontend
        console.log('\n[1/2] Building frontend project...');
        const frontendPath = path.join(__dirname, 'frontend');
        
        // Check if frontend directory exists
        if (!require('fs').existsSync(frontendPath)) {
            throw new Error(`Frontend directory not found at: ${frontendPath}`);
        }

        await runCommand('npm', ['run', 'build'], frontendPath);

        // 2. Commit to GitHub
        console.log('\n[2/3] Committing changes to GitHub...');
        await runCommand('git', ['add', '.']);
        
        const commitMsg = await new Promise((resolve) => {
            rl.question('Enter commit message (Press Enter for "update: auto deploy"): ', (answer) => {
                resolve(answer.trim() || 'update: auto deploy');
            });
        });
        
        // Wrap message in quotes for shell safety
        await runCommand('git', ['commit', '-m', `"${commitMsg}"`]);
        await runCommand('git', ['push', 'origin', 'main']);

        // 3. Deploy to GitHub Pages
        console.log('\n[3/3] Deploying to GitHub Pages...');
        await runCommand('npm', ['run', 'deploy'], frontendPath);

        console.log('\n==========================================');
        console.log('             SUCCESS!');
        console.log('==========================================');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main();
