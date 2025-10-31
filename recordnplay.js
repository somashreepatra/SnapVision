(function() {
    var wb;
    console.log('ok');
    // Define our constructor 
    function Player(options) {
        var WB = this;
        WB.toolbar = null;
        WB.recordBtn = null;
        WB.playBtn = null;
        WB.pauseBtn = null;
        WB.offBtn = null;
        WB.recordSteps = [];
        WB.recordList = null;
        WB.recordTitle = null;
        WB.modal = null;
        WB.dialog = null;
        WB.isRecording = false;
        WB.isPlaying = false;
        // Define option defaults 
        var defaults = {
            // Include popstate to capture path changes
            events: "click keydown change popstate select show hide"
        };
        // Create options by extending defaults with the passed in arugments
      if (arguments[0] && typeof arguments[0] === "object") {
        WB.options = extendDefaults(defaults, arguments[0]);
      }
      buildOut.call(WB);
      initializeEvents.call(WB);
      //setStorageItems();//
    }

    // Public Methods
    Player.prototype.start = function() {
        // console.log('start', this.mainWrap, document.querySelector('#main-wb-modal'));
        if(!this.isRecording && !this.isPlaying) {
            this.mainWrap.style.width = "80%";
            //if not modal open
            if( document.querySelector('#main-wb-modal') === null) {
                document.body.appendChild(this.modal);
                var events = this.options.events.split(' ');
                for (var i=0, iLen=events.length; i<iLen; i++) {
                    // Attach event listener to document to catch all events including those from dynamic dialogs
                    document.addEventListener(events[i], this.onEventHandler, true);
                }
                startRecording();
            }
        }
    }
    Player.prototype.stop = function() {

        this.mainWrap.style.width = "100%";
        // console.log('stop', this.mainWrap, document.querySelector('#main-wb-modal'));
        if(this.isRecording && !this.isPlaying) {
            //if modal open
            if( document.querySelector('#main-wb-modal') !== null) {
                document.body.removeChild(this.modal);
                var events = this.options.events.split(' ');
                for (var i=0, iLen=events.length; i<iLen; i++) {
                    document.removeEventListener(events[i], this.onEventHandler, true);
                }
                stopRecording();
            }
        }
        if(!this.isRecording && this.isPlaying) {
            //if modal open
            if( document.querySelector('#main-wb-modal') !== null) {
                document.body.removeChild(this.modal);
                stopPlaying();
            }
        }
    }
    Player.prototype.play = function() {
        // console.log('play', this.mainWrap, document.querySelector('#main-wb-modal'));
        if(!this.isRecording && !this.isPlaying) {
            this.mainWrap.style.width = "80%";
            //if not modal open
            if( document.querySelector('#main-wb-modal') === null) {
                document.body.appendChild(this.modal);
                startPlaying();
            }
        }
    }
    Player.prototype.onEventHandler = function(event) {
    // Only record events for elements outside our UI and modal
    if (event.target.id.indexOf('wb_') === -1 && !event.target.closest('#main-wb-modal')) {
            var elem = event.target;
            var elemStr = elem.toString();
            elemStr = elemStr.replace('object HTML', '');
            elemStr = elemStr.substring(1, elemStr.length - 1) + (elem.id ? '[#' + elem.id + ']': '');

            // Base element object with common properties
            var elemObj = {
                el: getElementXPath(elem),
                id: elem.id,
                type: event.type,
                step: '',
                ts: Date.now(),
                componentType: '', // Store PrimeNG component type
                label: '', // Store visible label/text
                value: '' // Store input value if applicable
            };

            // Handle file input specifically
            if (elem.tagName === 'INPUT' && elem.type === 'file') {
                if (event.type === 'change' && elem.files && elem.files.length > 0) {
                    const file = elem.files[0];
                    elemObj.isFileInput = true;
                    elemObj.fileName = file.name;
                    elemObj.fileType = file.type;
                    elemObj.step = `Select file "${file.name}"`;
                    
                    // Store file content as base64
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        elemObj.fileContent = e.target.result;
                        // Update storage after content is loaded
                        setStorageItems();
                    };
                    reader.readAsDataURL(file);
                }
            }

            // Detect PrimeNG component type
            const componentChecks = {
                splitButton: { selector: '.p-splitbutton', class: 'PrimeSplitButton' },
                dropdown: { selector: '.p-dropdown', class: 'PrimeDropdown' },
                button: { selector: '.p-button', class: 'PrimeButton' },
                checkbox: { selector: '.p-checkbox', class: 'PrimeCheckbox' },
                radioButton: { selector: '.p-radiobutton', class: 'PrimeRadioButton' },
                inputText: { selector: '.p-inputtext', class: 'PrimeInputText' },
                textarea: { selector: '.p-textarea', class: 'PrimeTextarea' },
                dialog: { selector: '.p-dialog', class: 'PrimeDialog' },
                dynamicDialog: { selector: '.p-dynamic-dialog', class: 'PrimeDynamicDialog' },
                dialogInput: { selector: '.p-dialog input, .p-dynamic-dialog input', class: 'PrimeDialogInput' },
                dialogTextarea: { selector: '.p-dialog textarea, .p-dynamic-dialog textarea', class: 'PrimeDialogTextarea' },
                dialogButton: { selector: '.p-dialog .p-button, .p-dynamic-dialog .p-button', class: 'PrimeDialogButton' },
                menuitem: { selector: '.p-menuitem', class: 'PrimeMenuItem' }
            };

            // Find closest PrimeNG component
            for (const [key, config] of Object.entries(componentChecks)) {
                const component = elem.closest(config.selector);
                if (component) {
                    elemObj.componentType = config.class;
                    // Store component-specific data
                    switch (config.class) {
                        case 'PrimeDropdown':
                            const dropdownLabel = component.querySelector('.p-dropdown-label');
                            elemObj.label = dropdownLabel ? dropdownLabel.textContent.trim() : '';
                            elemObj.dropdownId = component.id;
                            elemObj.dropdownPanel = getElementXPath(document.querySelector('.p-dropdown-panel'));
                            elemObj.selectedText = dropdownLabel ? dropdownLabel.textContent.trim() : '';
                            if(elem.closest('.p-dropdown-trigger')) {
                                elemObj.el = getElementXPath(component.querySelector('.p-dropdown-trigger'));
                            }
                            break;
                        case 'PrimeCheckbox':
                        case 'PrimeRadioButton':
                            const input = component.querySelector('input');
                            elemObj.checked = input ? input.checked : false;
                            elemObj.value = input ? input.value : '';
                            break;
                        case 'PrimeInputText':
                        case 'PrimeTextarea':
                            elemObj.value = elem.value || '';
                            break;
                        case 'PrimeSplitButton':
                            const buttonText = component.querySelector('.p-button-text');
                            elemObj.label = buttonText ? buttonText.textContent.trim() : '';
                            if(elem.closest('.p-splitbutton-menubutton')) {
                                elemObj.el = getElementXPath(component.querySelector('.p-splitbutton-menubutton'));
                            }
                            break;
                        case 'PrimeDialog':
                            elemObj.dialogId = component.id;
                            elemObj.visible = true;
                            break;
                        case 'PrimeMenuItem':
                            const menuText = component.querySelector('.p-menuitem-text');
                            elemObj.label = menuText ? menuText.textContent.trim() : '';
                            break;
                    }
                    break;
                }
            }

            var newListElem = document.createElement("li");
            var newListElemComm = document.createElement("span");
            newListElem.id = "li_" + wb.recordSteps.length;
            newListElemComm.innerHTML = '#';
            newListElemComm.title = "Add comment";
            newListElemComm.onclick = function(evt){
                buildComment(evt);
            }
            
            var newStep = '';
            
            // Generate step description based on component type
            switch (event.type) {
                case 'click':
                    switch (elemObj.componentType) {
                        case 'PrimeDropdown':
                            newStep = `Click dropdown "${elemObj.label}"`;
                            break;
                        case 'PrimeButton':
                        case 'PrimeSplitButton':
                            // Get button text and aria-label
                            const buttonText = elem.textContent?.trim() || '';
                            const ariaLabel = elem.getAttribute('aria-label') || '';
                            const buttonTitle = elem.getAttribute('title') || '';
                            // Use the most descriptive information available
                            const buttonDesc = buttonText || ariaLabel || buttonTitle || 'Unnamed button';
                            newStep = `Click button "${buttonDesc}"`;
                            // Store extra info for replay
                            elemObj.buttonText = buttonText;
                            elemObj.ariaLabel = ariaLabel;
                            elemObj.buttonTitle = buttonTitle;
                            break;
                        case 'PrimeCheckbox':
                            newStep = `${elemObj.checked ? 'Check' : 'Uncheck'} checkbox ${elemObj.label}`;
                            break;
                        case 'PrimeRadioButton':
                            newStep = `Select radio button "${elemObj.label}"`;
                            break;
                        case 'PrimeMenuItem':
                            newStep = `Click menu item "${elemObj.label}"`;
                            break;
                        default:
                            // For non-PrimeNG buttons, try to get descriptive text
                            if (elem.tagName === 'BUTTON' || (elem.tagName === 'INPUT' && elem.type === 'button')) {
                                const text = elem.textContent?.trim() || elem.value || '';
                                const label = elem.getAttribute('aria-label') || '';
                                const title = elem.getAttribute('title') || '';
                                const desc = text || label || title || elemStr;
                                newStep = `Click button "${desc}"`;
                            } else {
                                newStep = `Click ${elemStr}`;
                            }
                    }
                    break;
                case 'change':
                    if (elemObj.isFileInput) {
                        newStep = elemObj.step; // Use the file selection step we created above
                    } else {
                        switch (elemObj.componentType) {
                            case 'PrimeInputText':
                            case 'PrimeTextarea':
                                newStep = `Enter "${elemObj.value}" in ${elemObj.componentType.replace('Prime', '')}`;
                                break;
                            case 'PrimeDropdown':
                                newStep = `Select "${elemObj.selectedText}" from dropdown`;
                                break;
                            default:
                                newStep = `Change ${elemStr} to "${elem.value}"`;
                        }
                        elemObj.value = elem.value;
                    }
                    break;
                case 'keydown':
                    // Capture Enter key press in input or textarea
                    if (event.key === 'Enter' && (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA')) {
                        const value = elem.value || '';
                        newStep = `Press Enter in ${elemStr} with value "${value}"`;
                        elemObj.value = value;
                        elemObj.key = event.key;
                    }
                    break;
                default:
                    break;
            }

            if (newStep) {
                elemObj.step = newStep;
                // Push the new step
                wb.recordSteps.push(elemObj);
                newListElem.innerHTML = newStep;
                newListElem.appendChild(newListElemComm);
                wb.recordList.appendChild(newListElem);
                setStorageItems();
            }
        }
    }
    
    // Private Methods

    function buildOut() {

        var docFrag;
        // Create a DocumentFragment to build with
        docFrag = document.createDocumentFragment();
        // Create toolbar element
        this.toolbar = document.createElement("div");
        this.toolbar.id = "wb_toolbar";
        this.toolbar.className = "wb_toolbar ";
  
        this.toolbar.style.width = 115 + "px";
        this.toolbar.style.background = "linear-gradient(to bottom, #ffffff 0%, #88939a 100%)";
        this.toolbar.style.position = "fixed";
        this.toolbar.style.right = "45%";
        this.toolbar.style.bottom = "0";
        this.toolbar.style.padding = "3px 0 1px";
        this.toolbar.style.zIndex = "10";
        this.toolbar.style.textAlign = "center";
        this.toolbar.style.borderRadius = "3px 3px 0 0";

        // Create content area and append to toolbar
        var contentHolder = document.createElement("div");
        contentHolder.className = "toolbar-content";
        // contentHolder.innerHTML = 'WB';
        
        this.recordBtn = document.createElement("a");
        this.recordBtn.id = "wb_record_btn";
        this.recordBtn.innerHTML = "R";
        this.recordBtn.style.width = "20px";
        this.recordBtn.style.height = "20px";
        this.recordBtn.style.margin = "2px 5px";
        this.recordBtn.style.display = "inline-block";
        this.recordBtn.style.cursor = "pointer";
        this.recordBtn.style.border = "1px solid #ccc";
        this.recordBtn.style.borderRadius= "100%";
        this.recordBtn.style.color = "#545454";

        this.playBtn = document.createElement("a");
        this.playBtn.id = "wb_play_btn";
        this.playBtn.innerHTML = "P";
        this.playBtn.style.width = "20px";
        this.playBtn.style.height = "20px";
        this.playBtn.style.margin = "2px 5px";
        this.playBtn.style.display = "inline-block";
        this.playBtn.style.cursor = "pointer";
        this.playBtn.style.border = "1px solid #ccc";
        this.playBtn.style.borderRadius= "100%";
        this.playBtn.style.color = "#545454";

        this.pauseBtn = document.createElement("a");
        this.pauseBtn.id = "wb_pause_btn";
        this.pauseBtn.innerHTML = "||";
        this.pauseBtn.style.width = "20px";
        this.pauseBtn.style.height = "20px";
        this.pauseBtn.style.margin = "2px 5px";
        this.pauseBtn.style.display = "none";
        this.pauseBtn.style.cursor = "pointer";
        this.pauseBtn.style.border = "1px solid #ccc";
        this.pauseBtn.style.borderRadius= "100%";
        this.pauseBtn.style.color = "#545454";

        this.offBtn = document.createElement("a");
        this.offBtn.id = "wb_off_btn";
        this.offBtn.innerHTML = "S";
        this.offBtn.style.width = "20px";
        this.offBtn.style.height = "20px";
        this.offBtn.style.margin = "2px 5px";
        this.offBtn.style.display = "inline-block";
        this.offBtn.style.cursor = "pointer";
        this.offBtn.style.border = "1px solid #ccc";
        this.offBtn.style.borderRadius= "100%";
        this.offBtn.style.color = "#545454";

        contentHolder.appendChild(this.pauseBtn);
        contentHolder.appendChild(this.recordBtn);
        contentHolder.appendChild(this.playBtn);
        contentHolder.appendChild(this.offBtn);

        this.toolbar.appendChild(contentHolder);
        // Append toolbar to DocumentFragment
        docFrag.appendChild(this.toolbar);

        // Append DocumentFragment to body
        document.body.appendChild(docFrag);

        this.mainWrap = document.createElement("div");
        this.mainWrap.id = "main-wb-wrap";

        // Move the body's children into this wrapper
        while (document.body.firstChild)
        {
            this.mainWrap.appendChild(document.body.firstChild);
        }

        // Append the wrapper to the body
        document.body.appendChild(this.mainWrap);

        this.modal = document.createElement("div");
        this.modal.id = "main-wb-modal";
        this.modal.style.position = "fixed";
        this.modal.style.right = "0";
        this.modal.style.top = "50px";
        this.modal.style.zIndex = "10";
        this.modal.style.background = "linear-gradient(to bottom, #ffffff 0%, #ccc 100%)";
        this.modal.style.padding = "10px";
        this.modal.style.width = "20%";
        this.modal.style.height = "90%";
        this.modal.style.overflow = "auto";
        this.modal.style.border = "1px solid #555";

        // Build header for dragging and minimize
        this.header = document.createElement("div");
        this.header.id = "wb_modal_header";
        this.header.style.cursor = "move";
        this.header.style.background = "#ddd";
        this.header.style.padding = "5px";
        this.header.style.display = "flex";
        this.header.style.justifyContent = "space-between";

        // Add title to header
        this.recordTitle = document.createElement("h2");
        this.recordTitle.id = "wb_recordTitle_h2";
        this.recordTitle.style.margin = "0";
        this.header.appendChild(this.recordTitle);

        // Add minimize button
        this.minimizeBtn = document.createElement("button");
        this.minimizeBtn.id = "wb_modal_minimize";
        this.minimizeBtn.innerHTML = "_";
        this.minimizeBtn.style.cursor = "pointer";
        this.header.appendChild(this.minimizeBtn);

        this.modal.appendChild(this.header);

        // Record list container
        this.recordList = document.createElement("ul");
        this.recordList.id = "wb_recordList_ul";
        this.recordList.style.fontSize = "13px";
        this.recordList.style.color = "#545454";
        this.recordList.style.padding = "10px";
        this.modal.appendChild(this.recordList);

        // Minimize/restore handler
        var self = this;
        this.minimizeBtn.onclick = function() {
            if (self.recordList.style.display !== 'none') {
                // minimize: hide list and shrink modal to header height
                self.recordList.style.display = 'none';
                self.modal.style.height = self.header.offsetHeight + 'px';
                this.innerHTML = '▢';
            } else {
                // restore: show list and full height
                self.recordList.style.display = 'block';
                self.modal.style.height = '100%';
                this.innerHTML = '_';
            }
        };

        // Make modal movable
        makeElementDraggable(this.modal);
    }

    // Helper to make any element draggable
    function makeElementDraggable(el) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        // Ensure positioned correctly
        el.style.position = el.style.position || 'fixed';
        el.style.cursor = 'move';
        // Mouse down initiates drag
        el.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // Record starting mouse position
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // Calculate movement
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Adjust element position
            el.style.top = (el.offsetTop - pos2) + 'px';
            el.style.left = (el.offsetLeft - pos1) + 'px';
        }

        function closeDragElement() {
            // Stop movement listeners
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function buildDialog(type) {
        var docFrag;
        // Create a DocumentFragment to build with
        docFrag = document.createDocumentFragment();
        this.dialog = document.createElement("div");
        this.dialog.id = "main-wb-dialog";
        this.dialog.style.position = "absolute";
        this.dialog.style.right = "0";
        this.dialog.style.top = "50px";
        this.dialog.style.zIndex = "10";
        this.dialog.style.background = "linear-gradient(to bottom, #ffffff 0%, #ccc 100%)";
        this.dialog.style.padding = "10px";
        this.dialog.style.width = "400px";
        this.dialog.style.height = "200px";
        this.dialog.style.overflow = "auto";
        // this.dialog.innerHTML = 'Hi';
        // var type = 'saveRecording';
        switch (type) {
            case 'saveRecording':
                //this.dialog.innerHTML = 'Hi';
                // this.dialog.innerHTML ="Name";

                var fileInputLabel = document.createElement("label");
                fileInputLabel.id = "wb_recordFile_label";
                fileInputLabel.innerHTML = "File name:";
                this.dialog.appendChild(fileInputLabel);

                var fileInput = document.createElement("input");
                fileInput.id = "wb_recordFile_input";
                var d = new Date();
                var datestring = d.getDate()  + "_" + (d.getMonth()+1) + "_" + d.getFullYear() + "_" +d.getHours() + "_" + d.getMinutes();
                fileInput.value = "Recording_" + datestring;
                this.dialog.appendChild(fileInput);

                var fileInputCancel = document.createElement("button");
                fileInputCancel.id ="wb_recordFile_buttonCancel";
                fileInputCancel.innerHTML="Cancel";
                fileInputCancel.onclick = function() {
                    //saveRecording();
                    removeDialog();
                }
                this.dialog.appendChild(fileInputCancel);
                
                var fileInputSave = document.createElement("button");
                fileInputSave.id = "wb_recordFile_buttonSave";
                fileInputSave.innerHTML = "Save";
                fileInputSave.onclick = function() {
                fileInput.id = "wb_recordFile_input";
                    var name = document.getElementById("wb_recordFile_input").value;
                    console.log(name);
                    saveRecording(name);
                    removeDialog();
                }
                this.dialog.appendChild(fileInputSave);
                break;
            case 'startPlaying':
 
                var fileInputChoose = document.createElement("input");
                fileInputChoose.id = "wb_recordFile_choose_File";
                fileInputChoose.name = "file";
                fileInputChoose.type = "file";
                fileInputChoose.onchange = function(eve) {
                    //alert('changed');
                    handleFileSelect(eve);
                }
                this.dialog.appendChild(fileInputChoose);
               
                    var fileInputCancel = document.createElement("button");
                    fileInputCancel.id = "wb_recordFile_buttonCancel";
                    fileInputCancel.innerHTML = "Cancel";
                    fileInputCancel.onclick = function() {
                        removeDialog();
                        wb.stop();
                    }
                    this.dialog.appendChild(fileInputCancel);
                break;
            default:
                break;
        }

        // Append toolbar to DocumentFragment
        docFrag.appendChild(this.dialog);
        // Append DocumentFragment to body
        document.body.appendChild(docFrag);
    }
    function handleFileSelect(evt) {
        var files = evt.target.files; // FileList object

        // files is a FileList of File objects. List some properties.
        var output = [];
        for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function (theFile) {
                return function (e) {
                    console.log('e readAsText = ', e);
                    console.log('e readAsText target = ', e.target);
                    try {
                        json = JSON.parse(e.target.result);
                        playRecordSteps(json);
                        // alert('json global var has been set to parsed json of this file here it is unevaled = \n' + JSON.stringify(json));
                    } catch (ex) {
                        alert('Failed when trying to parse json = ' + ex);
                    }
                    removeDialog();
                }
            })(f);
            reader.readAsText(f);
        }

    }

    function buildComment(evt)
    {
        var curParentID = '';
        var parentID = evt.target.parentNode.id;
        var parent = document.getElementById(parentID);
        if( document.querySelector('#wb_recordFile_comment') !== null) {
            var span = document.getElementById("wb_recordFile_comment");
            curParentID = span.parentNode.parentNode.id;  
        }
        console.log(curParentID, parentID);
        removeComment();
        if(curParentID !== parentID) {
            removeComment();
            var recordStepIndex = parseInt(parentID.replace("li_", ""));
            var docFrag;
            // Create a DocumentFragment to build with
            docFrag = document.createDocumentFragment();
            this.comment = document.createElement("div");
            this.comment.id = "wb_recordFile_comment";
            this.comment.style.border = "1px solid #ccc";
            var textAreaComment = document.createElement("textarea");
            textAreaComment.id = "wb_recordFile_comment_text";
            if(recordStepIndex !== null  && recordStepIndex !== NaN && wb.recordSteps[recordStepIndex]['comment']) {
                textAreaComment.innerHTML = wb.recordSteps[recordStepIndex]['comment'];
                
            } else {
                textAreaComment.innerHTML = ""; //
                textAreaComment.placeholder = "Enter comment";
            }
            this.comment.appendChild(textAreaComment);

            var textAreaCancel = document.createElement("button");
            textAreaCancel.id ="wb_recordFile_buttontextCancel";
            textAreaCancel.innerHTML="Cancel";
            textAreaCancel.onclick = function() {
                //saveRecording();
                removeComment();
            }
            this.comment.appendChild(textAreaCancel);
            var textInputSave = document.createElement("button");
            textInputSave.id = "wb_recordFile_buttontextSave";
            textInputSave.innerHTML = "Save";
            textInputSave.onclick = function() {
                //textInputSave.id = "wb_recordFile_comment_text";
                var comment = document.getElementById("wb_recordFile_comment_text").value;
                console.log(comment, parent.querySelector('span'));
                parent.querySelector('span').setAttribute('title', comment);
               // saveRecording(name);
               
               if(recordStepIndex !== null  && recordStepIndex !== NaN) {
                    wb.recordSteps[recordStepIndex]['comment'] = comment;
                    setStorageItems();
               }
                
                removeComment();
            }
            this.comment.appendChild(textInputSave);
            
            parent.appendChild(this.comment);
        }
        
        // console.log('start Value Record Value');

    }
    function removeDialog() {
        if( document.querySelector('#main-wb-dialog') !== null) {
            document.body.removeChild(this.dialog);
        }
    }
    function removeComment() {
        if( document.querySelector('#wb_recordFile_comment') !== null) {
            var span = document.getElementById("wb_recordFile_comment");
            span.parentNode.removeChild(span);  
        }
    }
    function initializeEvents() {
        if (this.recordBtn) {
            this.recordBtn.addEventListener('click', this.start.bind(this));
        }
        if (this.playBtn) {
            this.playBtn.addEventListener('click', this.play.bind(this));
        }
        if (this.offBtn) {
            this.offBtn.addEventListener('click', this.stop.bind(this));
        }
    }
    function extendDefaults(source, properties) {
        var property;
        for (property in properties) {
          if (properties.hasOwnProperty(property)) {
            source[property] = properties[property];
          }
        }
        return source;
    }

    function startRecording() {
        //console.log('startRecording');
        manageIcons('startRecording');
        wb.isRecording = true;
        wb.recordSteps = [];
        wb.recordList.innerHTML = '';
        console.log('start Recording Value');
    // Record current pathname instead of hash
    var path = window.location.pathname || '/';
    var route = (path === '/' ? 'home' : path);
    var newStep = '<b>Currently on ' + route + ' page.</b>';
    var elemObj = {el: '', id: '', type: 'routechange', step: newStep, path: path, ts: Date.now()};
        wb.recordSteps.push(elemObj);
        
        wb.recordTitle.innerHTML = "New Recording";
        var newListElem = document.createElement("li");
        newListElem.id = "li_0";
        newListElem.innerHTML = newStep;
        var newListElemComm = document.createElement("span");
        newListElemComm.innerHTML = '#';
        newListElemComm.title = "Add comment";
        newListElemComm.onclick = function(evt){
            // console.log('newListElem');
            buildComment(evt);
        }

        newListElem.appendChild(newListElemComm);
        wb.recordList.appendChild(newListElem);
        setStorageItems();
    }

    function manageIcons(type) {
        switch (type) {
            case 'startRecording':
                wb.recordBtn.style.color = 'red';
                wb.playBtn.style.color = '#ddd';
                break;
        
            case 'stop':
                wb.recordBtn.style.color = '#545454';
                wb.playBtn.style.color = '#545454';
                break;          
            
            case 'startPlaying':
                wb.recordBtn.style.color = '#ddd';
                wb.playBtn.style.color = 'red';
                break;
            
            default:
                break;
        }
    }

    function stopRecording() {
        console.log('stopRecording');
        manageIcons('stop');
        wb.isRecording = false;
        setStorageItems();
        this.recordSteps = [];
        wb.recordList.innerHTML = '';
        buildDialog('saveRecording');
        // saveRecording();
    }
    function startPlaying() {
        //console.log('startPlaying..');
        buildDialog('startPlaying');
        // var recording = getStorageItem('recording');
        // var recording = wb.recordSteps;
        // console.log('startPlaying', recording);
        // manageIcons('startPlaying');
        // wb.recordSteps = recording;
        // wb.recordTitle.innerHTML = "Playing recorded steps...";
        // wb.isPlaying = true;
        // setStorageItems();
        // var timeout = recording[0].ts;
        // recording.forEach((element, index) => {
        //     var newListElem = document.createElement("li");
        //     newListElem.innerHTML = element.step;
        //     wb.recordList.appendChild(newListElem);
        //     setTimeout(() => {
        //         console.log(element);
        //         executeStep(element, index);
        //         if(index === recording.length -1) {
        //             wb.recordTitle.innerHTML = 'Playing steps completed.';
        //             setTimeout(() => {wb.stop();}, 3000);
        //         }
        //     }, element.ts - timeout);           
       // });
    }  
    /**
     * Play recorded steps, optionally resuming from a specific index.
     * @param {Array} recording - Array of recorded step objects
     * @param {number} startIndex - Index to start playback from (default 0)
     */
    function playRecordSteps(recording, startIndex = 0) {
        console.log('startPlaying from index', startIndex, recording, wb.modal);
        manageIcons('startPlaying');
        if( document.querySelector('#main-wb-modal') === null) {
            document.body.appendChild(wb.modal);
        }
        wb.recordSteps = recording;
        wb.recordTitle.innerHTML = "Playing recorded steps...";
        wb.isPlaying = true;
        setStorageItems();
        var timeout = recording[startIndex] ? recording[startIndex].ts : Date.now();
        // Render list items remaining
        for (let idx = startIndex; idx < recording.length; idx++) {
            const element = recording[idx];
            const newListElem = document.createElement("li");
            newListElem.innerHTML = element.step;
            if (element.comment) {
                const comm = document.createElement("span");
                comm.innerHTML = '#';
                comm.title = element.comment;
                newListElem.appendChild(comm);
            }
            wb.recordList.appendChild(newListElem);
            // Schedule execution
            setTimeout(() => {
                console.log('Playback step', idx, element);
                executeStep(element, idx);
                // Track playback index
                if (window.sessionStorage) sessionStorage.setItem('playIndex', JSON.stringify(idx));
                // End of playback
                if (idx === recording.length - 1) {
                    wb.recordTitle.innerHTML = 'Playing steps completed.';
                    setTimeout(() => { wb.stop(); }, 3000);
                }
            }, element.ts - timeout);
        }
    }
    function stopPlaying() {
        console.log('stopPlaying');
        wb.isPlaying = false;
        wb.recordList.innerHTML = '';
        sessionStorage.setItem('isPlaying', JSON.stringify(false));
        sessionStorage.removeItem('playIndex');
        sessionStorage.removeItem('recording');
        wb.recordSteps = [];
        wb.recordTitle.innerHTML = "Playback stopped.";
        manageIcons('stop');
    }

    function saveRecording(name) {
        var recording = getStorageItem('recording');
        var name = name || 'Recording';
        saveLocalFile(JSON.stringify(recording), name +'.rec', 'application/json');
    }

    function executeStep(element, index) {
        if(!wb.isPlaying) return;
        switch (element.type) {
            case 'routechange':   
                if(element.path && element.path !== window.location.pathname) {
                    console.log(element.path, window.location.pathname);
                    window.location.pathname = element.path; 
                }     
                break;
            case 'click':  
                if(element.el) {
                    var elem = evaluateXPath(element.el)[0];
                    console.log('elem', elem, typeof elem);
                    if(elem) {
                        elem.style.backgroundColor = 'yellow';
                        elem.click();
                        setTimeout(() => {
                            elem.style.backgroundColor = '';
                        }, 500);
                    } else {
                        console.log('Element not found:', element.el);
                    }
                }      
                break;
            case 'change':  
                if(element.el) {
                    var elem = evaluateXPath(element.el)[0];
                    if(elem) {
                        if (element.isFileInput && elem.type === 'file') {
                            try {
                                let fileContent;
                                
                                if (element.fileContent) {
                                    // Convert base64 back to binary
                                    const contentType = element.fileContent.split(',')[0].split(':')[1].split(';')[0];
                                    const base64 = element.fileContent.split(',')[1];
                                    const binaryString = atob(base64);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    fileContent = bytes.buffer;
                                } else {
                                    // Fallback to dummy content if no stored content
                                    fileContent = new Uint8Array([68, 117, 109, 109, 121]);
                                }
                                
                                // Create a File object with the actual content
                                const file = new File([fileContent], element.fileName, { 
                                    type: element.fileType || 'application/octet-stream',
                                    lastModified: new Date().getTime()
                                });
                                
                                // Create a DataTransfer to set files
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                
                                // Set the files property
                                elem.files = dataTransfer.files;
                                
                                // Dispatch events
                                elem.dispatchEvent(new Event('input', { bubbles: true }));
                                elem.dispatchEvent(new Event('change', { bubbles: true }));
                                
                                console.log('File selection replayed successfully:', file.name, file.size, 'bytes');
                            } catch (error) {
                                console.error('Error replaying file selection:', error);
                            }
                        } else {
                            elem.value = element.value;
                            elem.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        elem.style.backgroundColor = 'yellow';
                        elem.focus();
                        setTimeout(() => {
                            elem.style.backgroundColor = '';
                        }, 100);
                    } else {
                        console.log('Element not found:', element.el);
                    }
                }        
                break;
            case 'keydown':
                // Replay Enter key press without delay
                if (element.key === 'Enter' && element.el) {
                    var nodes = evaluateXPath(element.el);
                    var target = nodes[0];
                    if (target) {
                        target.value = element.value || target.value;
                        var eDown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
                        target.dispatchEvent(eDown);
                        var ePress = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
                        target.dispatchEvent(ePress);
                        var eUp = new KeyboardEvent('keyup', { key: 'Enter', bubbles: true });
                        target.dispatchEvent(eUp);
                    }
                }

                break;
            default:
                break;
        }

        wb.recordList.children[index].style.fontStyle = 'italic';
    }

    function getElementXPath(element) {
        var paths = [];
        var foundId = false;
        for (; element && element.nodeType == Node.ELEMENT_NODE; element = element.parentNode) {
            // If this node has an id, stop here and make the path relative to it
            if (element.id) {
                foundId = true;
                paths.unshift('//*[@id="' + element.id + '"]');
                break;
            }
            var index = 0;
            var hasFollowingSiblings = false;
            for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                    continue;
                if (sibling.nodeName == element.nodeName)
                    ++index;
            }
            for (var sibling = element.nextSibling;
                sibling && !hasFollowingSiblings;
                sibling = sibling.nextSibling) {
                if (sibling.nodeName == element.nodeName)
                    hasFollowingSiblings = true;
            }
            var tagName = (element.prefix ? element.prefix + ":" : "") + element.localName;
            var pathIndex = (index || hasFollowingSiblings ? "[" + (index + 1) + "]" : "");
            paths.unshift(tagName + pathIndex);
        }
        if (foundId) {
            return paths.join('/');
        } else {
            return paths.length ? '/' + paths.join('/') : null;
        }
    }

    function evaluateXPath(STR_XPATH) {
        var xresult = document.evaluate(STR_XPATH, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        var xnodes = [];
        var xres;
        while (xres = xresult.iterateNext()) {
            xnodes.push(xres);
        }
        return xnodes;
    }
    function getStorageItem(item) {
        if (window.sessionStorage) {
          return JSON.parse(sessionStorage.getItem(item));
        }
        else {
          return null;
        }
    }
    function setStorageItems() {
        console.log('wb.recordSteps', wb.recordSteps);
        if (window.sessionStorage) {
          sessionStorage.setItem("isRecording", JSON.stringify(wb.isRecording));
          sessionStorage.setItem("isPlaying", JSON.stringify(wb.isPlaying));
          sessionStorage.setItem("recording", JSON.stringify(wb.recordSteps));
        }
    }  
    
    document.onreadystatechange = () => {
        if (document.readyState === 'complete') {
            // Initialize Player on each load
            wb = new Player({});
            // Restore recording/play state from sessionStorage
            try {
                const saved = JSON.parse(sessionStorage.getItem('recording')) || [];
                if (JSON.parse(sessionStorage.getItem('isRecording'))) {
                    // Resume recording
                    const events = wb.options.events.split(' ');
                    events.forEach(ev => document.addEventListener(ev, wb.onEventHandler, true));
                    wb.isRecording = true;
                    wb.recordSteps = saved;
                    wb.recordList.innerHTML = '';
                    wb.recordTitle.innerHTML = 'Resumed Recording';
                    saved.forEach((step, i) => {
                        const li = document.createElement('li');
                        li.id = 'li_' + i;
                        li.innerHTML = step.step;
                        wb.recordList.appendChild(li);
                    });
                } else if (JSON.parse(sessionStorage.getItem('isPlaying'))) {
                    // Resume playback
                    wb.recordSteps = saved;
                    playRecordSteps(saved);
                }
            } catch(e) {
                console.warn('Failed to restore play/record state', e);
            }
        }
    };

    function saveLocalFile(content, name, type) {
        const a = document.body.appendChild(document.createElement('a'));
        const file = new Blob([content], {
          type: type
        });
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click(); 
    }

    // Player.prototype.playback = async function(idx) {
    //     var self = this;
    //     if(idx < this.recordSteps.length) {
    //         var el = recordSteps[idx];
    //         var elem = el.el;
    //         try {
    //             var elems = document.evaluate(elem, document, null, XPathResult.ANY_TYPE, null);
    //             var e = elems.iterateNext();
    //             if(e) {
    //                 // Handle PrimeNG components specially during playback
    //                 switch (el.componentType) {
    //                     case 'PrimeSplitButton':
    //                         // Click the main button if label matches
    //                         const mainBtn = e.querySelector('.p-button-text');
    //                         if (mainBtn && mainBtn.textContent.trim() === el.label) {
    //                             mainBtn.click();
    //                         } else {
    //                             // Try clicking the split dropdown arrow if present
    //                             const arrowBtn = e.querySelector('.p-splitbutton-menubutton');
    //                             if (arrowBtn) arrowBtn.click();
    //                         }
    //                         break;
    //                     case 'PrimeDropdown':
    //                         // Click to open dropdown
    //                         e.click();
    //                         // Wait for panel to appear
    //                         await this.waitForElement(el.dropdownPanel);
    //                         // Find and click the option with matching text
    //                         const options = document.querySelectorAll('.p-dropdown-items li');
    //                         for (const option of options) {
    //                             if (option.textContent.trim() === el.selectedText) {
    //                                 option.click();
    //                                 break;
    //                             }
    //                         }
    //                         break;
                            
    //                     case 'PrimeCheckbox':
    //                     case 'PrimeRadioButton':
    //                         // Only click if current state doesn't match desired state
    //                         const input = e.querySelector('input');
    //                         if (input && input.checked !== el.checked) {
    //                             e.click();
    //                         }
    //                         break;
                            
    //                     case 'PrimeInputText':
    //                     case 'PrimeTextarea':
    //                         e.value = el.value;
    //                         e.dispatchEvent(new Event('input', { bubbles: true }));
    //                         e.dispatchEvent(new Event('change', { bubbles: true }));
    //                         break;
                            
    //                     case 'PrimeDialog':
    //                     case 'PrimeDynamicDialog':
    //                         // Handle dialog visibility
    //                         const dialog = el.dialogId ? document.getElementById(el.dialogId) : e;
    //                         if (dialog) {
    //                             if (el.visible) {
    //                                 e.click(); // Click to open
    //                             } else {
    //                                 const closeBtn = dialog.querySelector('.p-dialog-header-close, .p-dynamic-dialog-header-close');
    //                                 if (closeBtn) closeBtn.click();
    //                             }
    //                         }
    //                         break;
                            
    //                     case 'PrimeDialogInput':
    //                     case 'PrimeDialogTextarea':
    //                         e.value = el.value;
    //                         e.dispatchEvent(new Event('input', { bubbles: true }));
    //                         e.dispatchEvent(new Event('change', { bubbles: true }));
    //                         break;
                            
    //                     case 'PrimeDialogButton':
    //                         await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before clicking buttons
    //                         e.click();
    //                         break;
                            
    //                     default:
    //                         // Default click behavior
    //                         e.click();
    //                 }
                    
    //                 // Add a slight delay between steps
    //                 setTimeout(function() {
    //                     self.playback(idx + 1);
    //                 }, 1000);
    //             } else {
    //                 console.error('Element not found:', elem);
    //                 self.playback(idx + 1);
    //             }
    //         } catch(err) {
    //             console.error('Error during playback:', err);
    //             self.playback(idx + 1);
    //         }
    //     } else {
    //         wb.recordPlay.disabled = false;
    //         wb.recordPause.disabled = true;
    //         wb.recordPlay.innerHTML = 'Play';
    //     }
    // }

    // // Helper function to wait for an element to appear
    // Player.prototype.waitForElement = function(xpath, timeout = 5000) {
    //     return new Promise((resolve, reject) => {
    //         const startTime = Date.now();
    //         const checkElement = () => {
    //             const elems = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
    //             const found = elems.iterateNext();
    //             if (found) {
    //                 resolve(found);
    //             } else if (Date.now() - startTime >= timeout) {
    //                 reject(new Error(`Element ${xpath} not found after ${timeout}ms`));
    //             } else {
    //                 setTimeout(checkElement, 100);
    //             }
    //         };
    //         checkElement();
    //     });
    // }

    // Player.prototype.executeStep = function(step) {
    //     // Find the element
    //     var elem = getElementByXPath(step.el);
    //     if (!elem) {
    //         this.errorCount++;
    //         console.error('Element not found:', step.el);
    //         return;
    //     }

    //     // Handle file input specifically
    //     if (step.isFileInput && elem.tagName === 'INPUT' && elem.type === 'file') {
    //         // Create a mock File object
    //         const mockFile = new File([''], step.fileName, { type: step.fileType });
            
    //         // Create a mock file list
    //         const dataTransfer = new DataTransfer();
    //         dataTransfer.items.add(mockFile);
            
    //         // Set the files property
    //         elem.files = dataTransfer.files;
            
    //         // Dispatch change event
    //         var event = new Event('change', { bubbles: true });
    //         elem.dispatchEvent(event);
    //         return;
    //     }

    //     // Handle other element types
    //     switch (step.type) {
    //         case 'routechange':
    //             if(step.path && step.path !== window.location.pathname) {
    //                 window.location.pathname = step.path;
    //             }
    //             break;
    //         case 'click':
    //             if(elem) {
    //                 if (step.componentType === 'PrimeSplitButton') {
    //                     // Try to click the main button or the menu arrow
    //                     var mainBtn = elem.querySelector('.p-button-text');
    //                     if (mainBtn && mainBtn.textContent.trim() === step.label) {
    //                         mainBtn.click();
    //                     } else {
    //                         var arrowBtn = elem.querySelector('.p-splitbutton-menubutton');
    //                         if (arrowBtn) arrowBtn.click();
    //                     }
    //                     elem.style.backgroundColor = 'yellow';
    //                     setTimeout(() => { elem.style.backgroundColor = ''; }, 500);
    //                 } else {
    //                     elem.click();
    //                 }
    //             }
    //             break;
    //         case 'change':
    //             if(elem) {
    //                 elem.value = step.value;
    //                 elem.dispatchEvent(new Event('input', { bubbles: true }));
    //                 elem.dispatchEvent(new Event('change', { bubbles: true }));
    //             }
    //             break;
    //         default:
    //             break;
    //     }
    // }
})();
