#!/usr/bin/env node

/**
 * Version Update Script for EasyConvert
 * Updates version across package.json, README.md, and creates changelog entry
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log('Usage: node scripts/update-version.js <new-version> <release-notes>');
    console.log('Example: node scripts/update-version.js 1.1.0 "Added new table detection algorithm"');
    process.exit(1);
}

const [newVersion, releaseNotes] = args;
const currentDate = new Date().toISOString().split('T')[0];

// Validate semantic version format
const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(newVersion)) {
    console.error('Error: Version must follow semantic versioning (e.g., 1.0.0)');
    process.exit(1);
}

try {
    // Update package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const oldVersion = packageJson.version;
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json: ${oldVersion} → ${newVersion}`);

    // Update README.md badges
    const readmePath = path.join(__dirname, '..', 'README.md');
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    readmeContent = readmeContent.replace(
        /version-\d+\.\d+\.\d+-blue/g,
        `version-${newVersion}-blue`
    );
    readmeContent = readmeContent.replace(
        /Current version: \*\*\d+\.\d+\.\d+\*\*/g,
        `Current version: **${newVersion}**`
    );
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ Updated README.md version badges`);

    // Update CHANGELOG.md
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');
    
    // Determine version type
    const [oldMajor, oldMinor, oldPatch] = oldVersion.split('.').map(Number);
    const [newMajor, newMinor, newPatch] = newVersion.split('.').map(Number);
    
    let versionType = 'patch';
    if (newMajor > oldMajor) versionType = 'major';
    else if (newMinor > oldMinor) versionType = 'minor';
    
    const changeType = versionType === 'major' ? 'Changed' : 
                      versionType === 'minor' ? 'Added' : 'Fixed';
    
    const newEntry = `## [${newVersion}] - ${currentDate}

### ${changeType}
- ${releaseNotes}

`;

    const updatedChangelog = changelogContent.replace(
        /^(# Changelog.*?\n)/m,
        `$1\n${newEntry}`
    );
    
    fs.writeFileSync(changelogPath, updatedChangelog);
    console.log(`✅ Added changelog entry for ${newVersion}`);

    // Success message
    console.log('\n🎉 Version update completed successfully!');
    console.log(`📦 New version: ${newVersion}`);
    console.log(`📝 Release notes: ${releaseNotes}`);
    console.log('\n📋 Next steps:');
    console.log('1. Review changes: git diff');
    console.log('2. Commit changes: git add . && git commit -m "Release v' + newVersion + '"');
    console.log('3. Create tag: git tag v' + newVersion);
    console.log('4. Push: git push && git push --tags');

} catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
} 