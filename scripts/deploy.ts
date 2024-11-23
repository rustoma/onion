import { execSync } from 'child_process';

try {
  console.log('Checking out to prod branch...');
  execSync('git checkout --orphan prod', {
    stdio: 'inherit',
  });

  console.log('Unstage all files...');
  execSync('git reset', {
    stdio: 'inherit',
  });

  console.log('Add files to the stage...');
  execSync('git add .', { stdio: 'inherit' });

  console.log('Committing changes...');
  execSync('git commit -m "Deploy to prod"', {
    stdio: 'inherit',
  });

  console.log('Pushing to prod branch on the server...');
  execSync('git push prod prod -f', { stdio: 'inherit' });

  console.log('Checking if there are any staged changes...');
  try {
    execSync('git diff --staged --quiet');
    console.log('No changes to commit.');
  } catch (e) {
    // If there are changes, `git diff --staged --quiet` will fail with non-zero exit code
    console.log('Staged changes detected. Committing changes...');
    execSync('git commit -m "wip"', { stdio: 'inherit' });
  }

  // Step 8: Checkout to dev branch
  console.log('Checking out back to dev branch...');
  execSync('git checkout dev', { stdio: 'inherit' });
  execSync('git branch -D prod', { stdio: 'inherit' });

  console.log('Deployment completed successfully!');
} catch (error) {
  console.error(
    'An error occurred during deployment:',
    (error as Error).message,
  );

  console.log('Add files to stage...');
  execSync('git add .', { stdio: 'inherit' });

  console.log('Checking if there are any staged changes...');
  try {
    execSync('git diff --staged --quiet');
    console.log('No changes to commit.');
  } catch (e) {
    // If there are changes, `git diff --staged --quiet` will fail with non-zero exit code
    console.log('Staged changes detected. Committing changes...');
    execSync('git commit -m "wip"', { stdio: 'inherit' });
  }

  console.log('Checking out back to dev branch...');
  execSync('git checkout dev', { stdio: 'inherit' });

  console.log('Delete local prod branch...');
  execSync('git branch -D prod', { stdio: 'inherit' });

  process.exit(1);
}
