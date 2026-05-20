const fs = require('fs');

function fixFile(filepath) {
    if (!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(/onRecordCreateRequest/g, 'onRecordCreate');
    content = content.replace(/onRecordUpdateRequest/g, 'onRecordUpdate');
    content = content.replace(/onRecordsListRequest/g, 'onRecordsList');
    content = content.replace(/onRecordViewRequest/g, 'onRecordView');
    fs.writeFileSync(filepath, content);
}

fixFile('pocketbase/pb_hooks/main.pb.js');
fixFile('pocketbase/pb_hooks/scratch_test.pb.js');
console.log('Hooks fixed');
