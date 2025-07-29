/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 * @description This portlet embeds a Suitelet form directly onto the dashboard using an iframe.
 */
define(['N/url', 'N/log'],
    /**
     * @param{url} url
     * @param{log} log
     */
    (url, log) => {

        /**
         * Defines the Portlet's entry point and handles the rendering of the portlet.
         * @param {Object} params
         * @param {Portlet} params.portlet - The portlet object used to render the content.
         */
        const render = (params) => {
            const portlet = params.portlet;
            portlet.title = 'File Uploader';

            try {
                // The Script ID and Deployment ID are correctly set.
                const suiteletScriptId = 'customscript286';
                const suiteletDeploymentId = 'customdeploy1'; 

                // 1. Resolve the URL of the Suitelet.
                // **FIX**: Added the 'params' property to append '&isportlet=T' to the URL.
                // This tells the Suitelet to render without the main NetSuite UI (header, nav, etc.).
                const suiteletUrl = url.resolveScript({
                    scriptId: suiteletScriptId,
                    deploymentId: suiteletDeploymentId,
                    params: {
                        isportlet: 'T'
                    }
                });

                log.debug('Suitelet URL Resolved', suiteletUrl);

                // 2. Create the iframe HTML to embed the Suitelet.
                // You can adjust the height as needed.
                const content = `<iframe src="${suiteletUrl}" style="width: 100%; height: 350px; border: none;"></iframe>`;

                // 3. Set the content of the portlet.
                portlet.html = content;

            } catch (e) {
                // This error will now only trigger if the script/deployment is deleted or renamed.
                portlet.html = `<div style="color:red; padding:10px;"><b>Portlet Error:</b><br/>Could not load Suitelet. Please verify the script/deployment IDs have not changed.</div>`;
                log.error('Portlet Rendering Error', e);
            }
        };

        return { render };
    });