/* EqDialog class
 * Helper class to provide Fancybox create_dialogality using the native HTML dialog element
 *
 * See MDN documentation for details on how the native element works
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
 */

const eq_dialog_defaults = {
    selector: '.eq-dialog',
    show_close_button: true,
    close_button_text: 'Close dialog',
    // remove_inline_content: takes inline divs used for content and removes duplicates
    remove_inline_content: false,
    style: {
        width: '600px',
    }
}
// Default HTML template for dialog content
eq_dialog_defaults.template_inner = `<div class="eq-dialog-inner"></div>`;
eq_dialog_defaults.template_close_button = `<form class="eq-close-btn" method="dialog"><button autofocus aria-label="{{close_btn_txt}}"></button></form>`;
eq_dialog_defaults.template_video = `<video class="eq-dialog-video" controls autoplay>` +
    `<source src="{{src}}" type="{{format}}" />` +
    'Sorry, your browser doesn\'t support embedded videos, <a href="{{src}}">download</a> and watch with your favorite video player!' +
    `</video>`;

class EqDialog {
    constructor(options = {}) {
        this.settings = JSON.parse(JSON.stringify(eq_dialog_defaults));
        // override defaults if provided
        for (const prop in options) {
            this.settings[prop] = options[prop];
            if (prop === 'style') {
                for (const style_name in options.style) {
                    this.settings.style[style_name] = options.style[style_name];
                }
            }
        }

        // Listen for tab press, if modal is open keep focus locked
        document.addEventListener('keydown', (e) => {
            let dialog = document.querySelector('dialog[open]');
            if (!dialog) {
                return;
            }
            // Dynamically find all focusable elements and determine the first and last one
            let dialog_focusables = dialog.querySelectorAll('button,input,select,textarea,iframe,area,a,*[tabindex="0"]');
            let first_focus = dialog_focusables.item(0);
            let last_focus = dialog_focusables.item(dialog_focusables.length - 1);
            if (!e.shiftKey && e.key === 'Tab') {
                if (document.activeElement === last_focus) {
                    e.preventDefault();
                    first_focus.focus();
                }
            }
            if (e.shiftKey && e.key === 'Tab') {
                if (document.activeElement === first_focus) {
                    e.preventDefault();
                    last_focus.focus();
                }
            }
        });
    }

    // Find all dialog buttons/links and generate HTML
    init() {
        let dialog_btns = document.querySelectorAll(this.settings.selector);
        dialog_btns.forEach((el) => {
            let dialog_type, dialog_id, href, src;
            dialog_type = el.dataset.type ? el.dataset.type : false;
            // Determine source of dialog content from href attribute or data-target attribute
            href = el.getAttribute('href');
            src = href ? href : el.dataset.target ? el.dataset.target : false;
            if (!src) {
                console.error(`Could not determine the dialog source. Please set the attribute 'href' or 'data-target'`);
                return;
            }
            // Determine what kind of dialog is being created
            if (!dialog_type) {
                if (src.match(/(^data:image\/[a-z0-9+\/=]*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg|ico)((\?|#).*)?$)/i)) {
                    dialog_type = 'image';
                } else if (src.match(/\.(mp4|mov|ogg|webm)((\?|#).*)?$/i)) {
                    dialog_type = 'video';
                } else if (src.match(/\.(pdf)((\?|#).*)?$/i)) {
                    dialog_type = 'iframe';
                } else if (src[0] === '#') {
                    dialog_type = 'inline';
                } else {
                    console.error(`Could not determine the dialog type for ${src}. Please specify the attribute 'data-type' or 'href'.`);
                    return;
                }
            }
            // Create an ID to assign to the dialog, take the existing ID attribute if there is one
            dialog_id = dialog_type === 'inline' && src ? src.substring(1) : this.generate_dialog_id(dialog_type);
            let dlg = this.create_dialog({
                dialog_type: dialog_type,
                dialog_id: dialog_id,
                src: src,
                img_alt: el.dataset.imgAlt ? el.dataset.imgAlt : '',
                close_button_text: el.dataset.closeBtnTxt ? el.dataset.closeBtnTxt : this.settings.close_button_text
            });
            if (!dlg) {
                return;
            }
            // Converts URL links to anchor link to prevent navigating away from page
            if (href) {
                el.setAttribute('href', `#${dialog_id}`);
            }
            // Assign event listeners the link/button to open the modal
            el.addEventListener('click', () => {
                dlg.showModal();
            });
        });
    }

    // Create and open a dialog immediately
    // The source is either the ID of a target element (without the #) or URL for the media file
    open(dialog_type, source, img_alt = '') {
        if (dialog_type === 'inline' && !source) {
            console.error(`Inline dialogs must have a target.`);
            return;
        }
        if (dialog_type === 'image' || dialog_type === 'iframe' || dialog_type === 'video' && !source) {
            console.error(`Media dialogs must have a source.`);
            return;
        }
        let dlg = this.create_dialog({
            dialog_type: dialog_type,
            dialog_id: dialog_type === 'inline' ? source : this.generate_dialog_id(dialog_type),
            src: dialog_type === 'inline' ? '' : source,
            img_alt: img_alt
        });
        if (!dlg) {
            return;
        }
        dlg.showModal();
    }

    /* Creates HTML dialog element with given parameters
     * Parameters:
     * dialog_id - ID of the target element the inline dialog will pull content from
     * src - URL of the image or iframe to be displayed
     * img_alt - Alt text to add to the image dialog
     */
    create_dialog(params = {}) {
        let settings = this.settings;
        // Create element for dialog
        let dialog = document.createElement('dialog');
        dialog.classList.add('eq-dialog-wrapper');
        dialog.innerHTML = settings.template_inner;

        let dialog_content = '';
        if (settings.show_close_button) {
            let close_btn_html = settings.template_close_button;
            close_btn_html = close_btn_html.replace('{{close_btn_txt}}', params.close_button_text);
            dialog_content += close_btn_html;
        }
        if (params.dialog_type === 'inline') {
            let inline_div = document.getElementById(params.dialog_id);
            if (!inline_div) {
                console.error('Unable to find element with ID of \'#' + params.dialog_id + '\'');
                return false;
            }
            dialog_content += inline_div.innerHTML;
            // Remove target inline div or remove the ID to prevent duplicate ID error
            if (this.settings.remove_inline_content) {
                inline_div.remove();
            } else {
                inline_div.removeAttribute('id');
            }
        }
        if (params.dialog_type === 'image') {
            dialog_content += `<img src="${params.src}" alt="${params.img_alt}">`;
        }
        if (params.dialog_type === 'video') {
            let matcher = /(?:\.([^.]+))?$/;
            let format = 'video/' + matcher.exec(params.src)[1];
            let vid_tpl = settings.template_video;
            vid_tpl = vid_tpl.replace('{{src}}', params.src);
            vid_tpl = vid_tpl.replace('{{format}}', format);
            dialog_content += vid_tpl;
        }
        if (params.dialog_type === 'iframe') {
            dialog_content += `<iframe src="${params.src}">`;
        }

        // Apply styling
        let inner_el = dialog.querySelector('.eq-dialog-inner');
        for (const style_name in settings.style) {
            inner_el.style[style_name] = settings.style[style_name];
        }
        // Add content to dialog and add it to the DOM
        inner_el.innerHTML = dialog_content;
        document.body.appendChild(dialog);

        return dialog;
    }

    generate_dialog_id(dialog_type) {
        let index = 0;
        let id = dialog_type + '-dialog-' + index;
        while (document.getElementById(id)) {
            index++;
            id = dialog_type + '-dialog-' + index;
        }
        return id;
    }
}
