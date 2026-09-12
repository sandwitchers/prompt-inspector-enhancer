import { eventSource, event_types, main_api, stopGeneration } from '../../../../script.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { POPUP_RESULT, POPUP_TYPE, Popup } from '../../../popup.js';
import { t } from '../../../i18n.js';

const path = 'third-party/Extension-PromptInspector';
const supportsYaml = typeof SillyTavern.libs === 'object' && 'yaml' in SillyTavern.libs;

if (!('GENERATE_AFTER_COMBINE_PROMPTS' in event_types) || !('CHAT_COMPLETION_PROMPT_READY' in event_types)) {
    toastr.error('Required event types not found. Update SillyTavern to the latest version.');
    throw new Error('Events not found.');
}

function isChatCompletion() {
    return main_api === 'openai';
}

function addLaunchButton() {
    const enabledText = t`Stop Inspecting`;
    const disabledText = t`Inspect Prompts`;
    const enabledIcon = 'fa-solid fa-bug-slash';
    const disabledIcon = 'fa-solid fa-bug';

    const getIcon = () => inspectEnabled ? enabledIcon : disabledIcon;
    const getText = () => inspectEnabled ? enabledText : disabledText;

    const launchButton = document.createElement('div');
    launchButton.id = 'inspectNextPromptButton';
    launchButton.classList.add('list-group-item', 'flex-container', 'flexGap5', 'interactable');
    launchButton.tabIndex = 0;
    launchButton.title = t`Toggle prompt inspection`;
    const icon = document.createElement('i');
    icon.className = getIcon();
    launchButton.appendChild(icon);
    const textSpan = document.createElement('span');
    textSpan.textContent = getText();
    launchButton.appendChild(textSpan);

    const extensionsMenu = document.getElementById('prompt_inspector_wand_container') ?? document.getElementById('extensionsMenu');
    extensionsMenu.classList.add('interactable');
    extensionsMenu.tabIndex = 0;

    if (!extensionsMenu) {
        throw new Error('Could not find the extensions menu');
    }

    extensionsMenu.appendChild(launchButton);
    launchButton.addEventListener('click', () => {
        toggleInspectNext();
        textSpan.textContent = getText();
        icon.className = getIcon();
    });
}

let inspectEnabled = localStorage.getItem('promptInspectorEnabled') === 'true' || false;
let inspectFormat = localStorage.getItem('promptInspectorFormat') || 'json';

function toggleInspectNext() {
    inspectEnabled = !inspectEnabled;
    toastr.info(`Prompt inspection is now ${inspectEnabled ? 'enabled' : 'disabled'}`);
    localStorage.setItem('promptInspectorEnabled', String(inspectEnabled));
}

eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, async (data) => {
    if (!inspectEnabled) {
        return;
    }

    if (data.dryRun) {
        console.debug('Prompt Inspector: Skipping dry run prompt');
        return;
    }

    if (!isChatCompletion()) {
        console.debug('Prompt Inspector: Not a chat completion prompt');
        return;
    }

    const promptJson = JSON.stringify(data.chat, null, 4);
    const result = await showPromptInspector(promptJson);

    if (result === promptJson) {
        console.debug('Prompt Inspector: No changes');
        return;
    }

    try {
        const chat = JSON.parse(result);

        // Chat is passed by reference, so we can modify it directly
        if (Array.isArray(chat) && Array.isArray(data.chat)) {
            data.chat.splice(0, data.chat.length, ...chat);
        }

        console.debug('Prompt Inspector: Prompt updated');
    } catch (e) {
        console.error('Prompt Inspector: Invalid JSON');
        toastr.error('Invalid JSON');
    }
});

eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS, async (data) => {
    if (!inspectEnabled) {
        return;
    }

    if (data.dryRun) {
        console.debug('Prompt Inspector: Skipping dry run prompt');
        return;
    }

    if (isChatCompletion()) {
        console.debug('Prompt Inspector: Not a chat completion prompt');
        return;
    }

    const result = await showPromptInspector(data.prompt);

    if (result === data.prompt) {
        console.debug('Prompt Inspector: No changes');
        return;
    }

    data.prompt = result;
    console.debug('Prompt Inspector: Prompt updated');
});

function jsonToYaml(json) {
    try {
        const obj = JSON.parse(json);
        return SillyTavern.libs.yaml.stringify(obj, { lineWidth: 0 });
    } catch (e) {
        console.error('Prompt Inspector: Failed to convert JSON to YAML', e);
        toastr.error('Failed to convert JSON to YAML');
        throw e;
    }
}

function yamlToJson(yaml) {
    try {
        const obj = SillyTavern.libs.yaml.parse(yaml);
        return JSON.stringify(obj, null, 4);
    }
    catch (e) {
        console.error('Prompt Inspector: Failed to convert YAML to JSON', e);
        toastr.error('Failed to convert YAML to JSON');
        throw e;
    }
}

/* ------------------------------------------------------------------ */
/* Beautify helpers                                                     */
/*                                                                      */
/* The Beautify view is a derived, read-only visualization built on    */
/* top of whatever is currently the canonical JSON (chat completion)   */
/* or raw string (text completion) content. It never becomes the       */
/* source of truth itself, so switching away from it can never corrupt */
/* or lose data. Actual edits still happen in JSON / YAML / Raw Text.  */
/* ------------------------------------------------------------------ */

const MACRO_REGEX = /\{\{[^{}]+\}\}/g;

/**
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

/**
 * Counts unresolved {{macro}} occurrences left in already-combined prompt text.
 * A leftover macro at this stage (after ST's own substitution has run) usually
 * means a typo'd or unsupported macro name in a preset entry.
 * @param {string} text
 * @returns {number}
 */
function countMacros(text) {
    const matches = String(text ?? '').match(MACRO_REGEX);
    return matches ? matches.length : 0;
}

/**
 * @param {string} text
 * @returns {string} HTML-safe string with unresolved macros wrapped for highlighting.
 */
function highlightMacros(text) {
    const safe = escapeHtml(text);
    return safe.replace(MACRO_REGEX, (match) => `<mark class="pi-macro-warn">${match}</mark>`);
}

/**
 * @param {string} role
 * @returns {string}
 */
function roleClass(role) {
    switch (role) {
        case 'system': return 'pi-role-system';
        case 'user': return 'pi-role-user';
        case 'assistant': return 'pi-role-assistant';
        case 'tool': return 'pi-role-tool';
        default: return 'pi-role-other';
    }
}

/**
 * @param {string} text
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        toastr.info(t`Copied to clipboard`);
    } catch (e) {
        console.error('Prompt Inspector: Clipboard copy failed', e);
        toastr.error(t`Failed to copy to clipboard`);
    }
}

/**
 * Heuristically splits a raw (text-completion) prompt into visual blocks.
 * This is NOT guaranteed to map 1:1 onto the original preset entries — ST does
 * not preserve that information once everything is flattened into one string.
 * It only recognizes a handful of common instruct formats, and otherwise falls
 * back to splitting on blank lines. Both cases are labeled honestly in the UI.
 * @param {string} raw
 * @returns {{style: string, segments: string[]}|null}
 */
function segmentRawPrompt(raw) {
    const text = String(raw ?? '');

    const patterns = [
        { style: 'ChatML (<|im_start|>…<|im_end|>)', regex: /<\|im_start\|>[\s\S]*?<\|im_end\|>/g },
        { style: 'Llama-style [INST]…[/INST]', regex: /\[INST\][\s\S]*?\[\/INST\]/g },
        { style: 'Alpaca-style (### Instruction/Input/Response)', regex: /###\s*(?:Instruction|Input|Response)[\s\S]*?(?=###\s*(?:Instruction|Input|Response)|$)/g },
    ];

    for (const pattern of patterns) {
        const found = text.match(pattern.regex);
        if (found && found.length > 1) {
            return { style: pattern.style, segments: found };
        }
    }

    const blocks = text.split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
    if (blocks.length > 1) {
        return { style: 'blank-line fallback (bukan format instruct yang dikenali)', segments: blocks };
    }

    return null;
}

/**
 * Shows a prompt inspector popup.
 * @param {string} input Initial prompt JSON (chat completion) or raw string (text completion)
 * @returns {Promise<string>} Updated prompt content
 */
async function showPromptInspector(input) {
    const chatCompletion = isChatCompletion();
    const yamlAvailable = supportsYaml && chatCompletion;

    const template = $(await renderExtensionTemplateAsync(path, 'template'));
    const prompt = template.find('#inspectPrompt');
    const formatSelect = template.find('#inspectPromptFormat');
    const beautifyContainer = template.find('#inspectPromptBeautify');
    const cardsContainer = template.find('#pi-beautify-cards');
    const emptyNotice = template.find('#pi-beautify-empty');
    const filterInput = template.find('#pi-beautify-filter');
    const summaryCount = template.find('#pi-summary-count');
    const summaryChars = template.find('#pi-summary-chars');
    const summaryMacros = template.find('#pi-summary-macros');
    const editLinkButton = template.find('#pi-beautify-edit-link');

    formatSelect.find('option[value="json"]').toggle(chatCompletion);
    formatSelect.find('option[value="yaml"]').toggle(yamlAvailable);
    formatSelect.find('option[value="raw"]').toggle(!chatCompletion);

    // Resolve a format that's actually valid for this context, falling back
    // to a sane default without permanently overwriting the saved preference.
    let currentFormat = inspectFormat;
    if (chatCompletion) {
        if (currentFormat === 'raw') currentFormat = 'json';
        if (currentFormat === 'yaml' && !yamlAvailable) currentFormat = 'json';
    } else {
        if (currentFormat === 'json' || currentFormat === 'yaml') currentFormat = 'raw';
    }

    let canonicalValue = input;
    formatSelect.val(currentFormat);

    function toCanonicalFromView(format, value) {
        if (format === 'yaml') return yamlToJson(value);
        return value;
    }

    function fromCanonicalToView(format, canonical) {
        if (format === 'yaml') return jsonToYaml(canonical);
        return canonical;
    }

    function renderChatBeautify(jsonString) {
        let messages;
        try {
            messages = JSON.parse(jsonString);
            if (!Array.isArray(messages)) {
                throw new Error('Root value is not an array');
            }
        } catch (e) {
            cardsContainer.html(`<div class="pi-parse-error">${t`Could not parse JSON`}: ${escapeHtml(e.message)}. ${t`Fix it in JSON mode, then switch back to Beautify.`}</div>`);
            summaryCount.text('');
            summaryChars.text('');
            summaryMacros.hide();
            return;
        }

        let totalChars = 0;
        let totalMacros = 0;

        messages.forEach((message, index) => {
            const role = message && typeof message.role === 'string' ? message.role : 'unknown';
            const content = message && message.content != null ? String(message.content) : '';
            const macroCount = countMacros(content);
            totalChars += content.length;
            totalMacros += macroCount;

            const card = $('<div class="pi-card"></div>');
            const header = $('<div class="pi-card-header"></div>');
            header.append('<i class="fa-solid fa-chevron-down pi-card-chevron"></i>');
            header.append(`<span class="pi-position">#${index}</span>`);
            header.append(`<span class="pi-badge ${roleClass(role)}">${escapeHtml(role)}</span>`);
            if (message && message.name) {
                header.append(`<span class="pi-name-badge">${escapeHtml(String(message.name))}</span>`);
            }

            const meta = $('<span class="pi-meta"></span>');
            meta.append(`<span>${content.length} char</span>`);
            if (macroCount > 0) {
                meta.append(`<span class="pi-macro-count">⚠ ${macroCount}</span>`);
            }
            header.append(meta);

            const actions = $(`<span class="pi-card-actions"><button type="button" class="menu_button" title="${t`Copy content`}"><i class="fa-solid fa-copy"></i></button></span>`);
            actions.find('button').on('click', (event) => {
                event.stopPropagation();
                copyToClipboard(content);
            });
            header.append(actions);

            header.on('click', () => card.toggleClass('pi-collapsed'));

            const body = $('<div class="pi-card-body"></div>');
            body.html(content.length ? highlightMacros(content) : `<span style="opacity:.5">(${t`empty`})</span>`);

            card.append(header).append(body);
            card.attr('data-pi-search-text', `${role} ${message?.name ?? ''} ${content}`.toLowerCase());
            cardsContainer.append(card);
        });

        summaryCount.text(`${messages.length} ${t`entries`}`);
        summaryChars.text(`${totalChars} ${t`chars`}`);
        summaryMacros.toggle(totalMacros > 0).text(`⚠ ${totalMacros} ${t`unresolved macro(s)`}`);
    }

    function renderRawBeautify(rawText) {
        const text = String(rawText ?? '');
        const segmentation = segmentRawPrompt(text);
        const totalMacros = countMacros(text);

        function appendBlockCard(label, content, index) {
            const macroCount = countMacros(content);
            const card = $('<div class="pi-card"></div>');
            const header = $('<div class="pi-card-header"></div>');
            header.append('<i class="fa-solid fa-chevron-down pi-card-chevron"></i>');
            if (index !== undefined) {
                header.append(`<span class="pi-position">#${index}</span>`);
            }
            header.append(`<span class="pi-badge pi-role-other">${escapeHtml(label)}</span>`);
            const meta = $('<span class="pi-meta"></span>');
            meta.append(`<span>${content.length} char</span>`);
            if (macroCount > 0) {
                meta.append(`<span class="pi-macro-count">⚠ ${macroCount}</span>`);
            }
            header.append(meta);
            header.on('click', () => card.toggleClass('pi-collapsed'));
            const body = $('<div class="pi-card-body"></div>');
            body.html(content.length ? highlightMacros(content) : `<span style="opacity:.5">(${t`empty`})</span>`);
            card.append(header).append(body);
            card.attr('data-pi-search-text', content.toLowerCase());
            cardsContainer.append(card);
        }

        if (!segmentation) {
            cardsContainer.append(`<div class="pi-fallback-note">${t`No recognizable instruct pattern found — showing the whole prompt as a single block.`}</div>`);
            appendBlockCard('FULL PROMPT', text, undefined);
            summaryCount.text(`1 ${t`block`}`);
        } else {
            cardsContainer.append(`<div class="pi-fallback-note">${t`Auto-segmented using pattern`}: ${escapeHtml(segmentation.style)}. ${t`This is a heuristic, not a direct map to your original preset entries.`}</div>`);
            segmentation.segments.forEach((segment, index) => appendBlockCard('BLOK', segment, index));
            summaryCount.text(`${segmentation.segments.length} ${t`block(s)`}`);
        }

        summaryChars.text(`${text.length} ${t`chars`}`);
        summaryMacros.toggle(totalMacros > 0).text(`⚠ ${totalMacros} ${t`unresolved macro(s)`}`);
    }

    function renderBeautify(canonical) {
        cardsContainer.empty();
        emptyNotice.hide();
        if (chatCompletion) {
            renderChatBeautify(canonical);
        } else {
            renderRawBeautify(canonical);
        }
        applyFilter(filterInput.val());
    }

    function applyFilter(query) {
        const needle = String(query || '').trim().toLowerCase();
        const cards = cardsContainer.find('.pi-card');
        if (!needle) {
            cards.removeClass('pi-card-hidden-by-filter');
            emptyNotice.hide();
            return;
        }
        let visible = 0;
        cards.each(function () {
            const haystack = $(this).attr('data-pi-search-text') || '';
            const isMatch = haystack.includes(needle);
            $(this).toggleClass('pi-card-hidden-by-filter', !isMatch);
            if (isMatch) visible++;
        });
        emptyNotice.toggle(visible === 0);
    }

    function switchTo(newFormat) {
        const oldFormat = currentFormat;
        try {
            const canonical = oldFormat === 'beautify' ? canonicalValue : toCanonicalFromView(oldFormat, prompt.val());
            canonicalValue = canonical;

            if (newFormat === 'beautify') {
                prompt.hide();
                beautifyContainer.show();
                renderBeautify(canonical);
            } else {
                beautifyContainer.hide();
                prompt.show();
                prompt.val(fromCanonicalToView(newFormat, canonical));
            }

            currentFormat = newFormat;
            inspectFormat = newFormat;
            localStorage.setItem('promptInspectorFormat', newFormat);
        } catch (e) {
            console.error('Prompt Inspector: Failed to switch format', e);
            formatSelect.val(oldFormat);
        }
    }

    // Initial render for the resolved starting format (no localStorage write here;
    // this only reflects context constraints, not a user-driven preference change).
    if (currentFormat === 'beautify') {
        prompt.hide();
        beautifyContainer.show();
        renderBeautify(canonicalValue);
    } else {
        prompt.val(fromCanonicalToView(currentFormat, canonicalValue));
    }

    formatSelect.on('change', () => switchTo(formatSelect.val()));
    filterInput.on('input', () => applyFilter(filterInput.val()));
    editLinkButton.on('click', () => {
        formatSelect.val(chatCompletion ? 'json' : 'raw');
        switchTo(formatSelect.val());
    });

    /** @type {import('../../../popup').CustomPopupButton} */
    const customButton = {
        text: 'Cancel generation',
        result: POPUP_RESULT.CANCELLED,
        appendAtEnd: true,
        action: async () => {
            await stopGeneration();
            await popup.complete(POPUP_RESULT.CANCELLED);
        },
    };
    const popup = new Popup(template, POPUP_TYPE.CONFIRM, '', { wide: true, large: true, okButton: 'Save changes', cancelButton: 'Discard changes', customButtons: [customButton] });
    const result = await popup.show();

    // If the user cancels, return the original input
    if (!result) {
        return input;
    }

    // Beautify is a read-only lens: whatever was last held in canonicalValue is
    // the actual content, whether the popup was left in Beautify or an edit mode.
    const output = currentFormat === 'beautify' ? canonicalValue : toCanonicalFromView(currentFormat, prompt.val());

    return String(output);
}

(function init() {
    addLaunchButton();
})();
