/**
 * Email Capture Plug-in to save the first attachment from an email
 * to the NetSuite File Cabinet.
 */
function process(email) {
    try {
        nlapiLogExecution('DEBUG', 'SCRIPT START', 'Email Capture triggered by: ' + email.getFrom().getEmail());

        var attachments = email.getAttachments();

        if (!attachments || attachments.length === 0) {
            nlapiLogExecution('AUDIT', 'No Attachments', 'Email had no attachments.');
            return;
        }

        nlapiLogExecution('DEBUG', 'Processing Attachment', 'File: ' + attachments[0].getName());

        var destinationFolderId = -15; // 'Attachments to Send' folder
        var fileToUpload = attachments[0];
        fileToUpload.setFolder(destinationFolderId);

        var fileId = nlapiSubmitFile(fileToUpload);

        nlapiLogExecution('AUDIT', 'SUCCESS: File Saved', 'File Name: ' + fileToUpload.getName() + ' | New File ID: ' + fileId);

    } catch (e) {
        nlapiLogExecution('ERROR', 'SCRIPT ERROR', 'Error: ' + e.name + ' | Details: ' + e.message);
    }
}

