/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description A concise Suitelet that uploads, parses, saves a file, sends a confirmation email, and can be displayed cleanly in a portlet.
 */
define(['N/ui/serverWidget', 'N/file', 'N/log', 'N/email', 'N/runtime'],
    (serverWidget, file, log, email, runtime) => {

    /**
     * Defines the Suitelet's entry point and handles logic for GET and POST requests.
     * @param {Object} context - The Suitelet context object.
     */
    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            // --- MODIFICATION: Check if the Suitelet is being run in a portlet ---
            // This looks for a URL parameter 'isportlet=T', which should be sent by the portlet script.
            const isPortlet = context.request.parameters.isportlet === 'T';

            // Create and display the upload form for the user.
            // The 'hideNavBar' property is set to true if it's a portlet, cleaning up the UI.
            const form = serverWidget.createForm({
                title: 'File Upload and Email Confirmation',
                hideNavBar: isPortlet
            });

            form.addField({
                id: 'custpage_file_upload',
                type: serverWidget.FieldType.FILE,
                label: 'Select File'
            }).isMandatory = true;
            form.addField({
                id: 'custpage_email_address',
                type: serverWidget.FieldType.EMAIL,
                label: 'Your Email for Confirmation'
            }).isMandatory = true;
            form.addSubmitButton({ label: 'Upload and Process' });
            context.response.writePage(form);

        } else { // This block handles the POST request after the user submits the form
            let title = 'Error Occurred';
            let message = '';
            try {
                const request = context.request;
                const uploadedFile = request.files.custpage_file_upload;
                const emailAddress = request.parameters.custpage_email_address;

                if (!uploadedFile) throw new Error('No file was selected.');
                if (!emailAddress) throw new Error('A confirmation email address is required.');

                // --- File Parsing Logic ---
                const fileContent = uploadedFile.getContents();
                const lines = fileContent ? fileContent.split(/\r\n|\n|\r/).filter(line => line.trim() !== '') : [];
                const lineCount = lines.length;
                const columnCount = lineCount > 0 ? lines[0].split(',').length : 0;

                // --- Save File Logic ---
                uploadedFile.folder = -15; // IMPORTANT: Set your target folder ID
                const fileId = uploadedFile.save();
                log.audit('File Upload Successful', `File ID: ${fileId}, Lines: ${lineCount}, Columns: ${columnCount}`);

                // --- Send Email Logic ---
                const currentUser = runtime.getCurrentUser();
                const emailBody = `Your file, "${uploadedFile.name}", was successfully uploaded.\n\n` +
                                  `File ID: ${fileId}\n` +
                                  `Total Lines/Rows: ${lineCount}\n` +
                                  `Columns in First Row: ${columnCount}`;
                email.send({
                    author: currentUser.id,
                    recipients: emailAddress,
                    subject: `NetSuite Upload Confirmation: ${uploadedFile.name}`,
                    body: emailBody,
                    relatedRecords: { entityId: currentUser.id }
                });
                log.audit('Confirmation Email Sent', `Email sent to ${emailAddress} for File ID ${fileId}`);

                // --- Prepare Success Message ---
                title = 'Upload Successful!';
                message = `<div style="color: #10723b; font-size: 16px;">` +
                          `Your file, "<b>${uploadedFile.name}</b>", has been saved with ID: <b>${fileId}</b>.<br/>` +
                          `A confirmation email has been sent to <b>${emailAddress}</b>.` +
                          `</div>`;

            } catch (e) {
                log.error('Suitelet Processing Error', e);
                message = `<div style="color: #d9534f; font-size: 16px;"><b>An error occurred:</b><br/>${e.message}</div>`;
            }

            // Display the final result message to the user
            const resultPage = serverWidget.createForm({ title: title });
            resultPage.addField({
                id: 'custpage_message',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            }).defaultValue = message;
            context.response.writePage(resultPage);
        }
    };

    return { onRequest };
});

