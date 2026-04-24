const READY_PROMPT = `أنت مساعد متخصص في تحويل النصوص العلمية إلى HTML منظم وجاهز للطباعة داخل صفحات A4.

المطلوب:
حوّل النص التالي إلى HTML داخلي فقط.

قواعد صارمة:
1. أخرج HTML فقط، بدون شرح خارجي.
2. لا تكتب <html> أو <head> أو <body>.
3. استخدم <h1> مرة واحدة فقط لعنوان الموضوع.
4. استخدم <h2> للعناوين الفرعية.
5. استخدم <p> للفقرات.
6. استخدم <ul> و <li> للنقاط.
7. استخدم <table> عند وجود مقارنة أو تصنيف.
8. استخدم <blockquote> للملاحظات الامتحانية المهمة.
9. أي مصطلح إنجليزي أو اختصار أو اسم تقنية يوضع داخل:
   <span class="ltr">TERM</span>
10. لا تضع المعادلات داخل class="ltr".
11. المعادلات الرياضية تكتب بصيغة LaTeX:
    - داخل السطر: \\(O(n \\log n)\\)
    - كسطر مستقل:
      \\[
      T(n) = O(n \\log n)
      \\]
12. لا تستخدم inline style.
13. لا تستخدم Markdown.
14. اجعل المحتوى مختصراً ومناسباً لصفحة A4 واحدة.
15. لا تكثر من الزخرفة؛ المحتوى يجب أن يكون تعليمياً واضحاً.

النص:
[الصق النص هنا]`;

function openAddModal() {
    editingIndex = -1;
    document.getElementById('pageModalTitle').textContent = 'إضافة صفحة';
    document.getElementById('topicInput').value = '';
    document.getElementById('contentInput').value = '';
    openModal('pageModal');
    document.getElementById('topicInput').focus();
}

function openEditModal(index) {
    const page = state.pages[index];
    if (!page) {
        return;
    }

    editingIndex = index;
    document.getElementById('pageModalTitle').textContent = 'تعديل صفحة';
    document.getElementById('topicInput').value = page.topic;
    document.getElementById('contentInput').value = page.content;
    openModal('pageModal');
    document.getElementById('topicInput').focus();
}

function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (!document.querySelector('.modal-backdrop.is-open')) {
        document.body.classList.remove('modal-open');
    }
}

function savePage() {
    const topic = document.getElementById('topicInput').value.trim();
    const content = document.getElementById('contentInput').value.trim();

    if (!topic) {
        showToast('اكتب اسم الموضوع أولاً');
        document.getElementById('topicInput').focus();
        return;
    }

    const page = { topic, content };

    if (editingIndex >= 0) {
        state.pages[editingIndex] = page;
        showToast('تم تعديل الصفحة');
    } else {
        state.pages.push(page);
        showToast('تمت إضافة الصفحة');
    }

    closeModal('pageModal');
    renderAll();
    scheduleAutoSave();
}

function openPromptModal() {
    document.getElementById('promptText').value = READY_PROMPT;
    openModal('promptModal');
    document.getElementById('promptText').focus();
}

async function copyPrompt() {
    const promptText = document.getElementById('promptText');
    promptText.select();

    try {
        await navigator.clipboard.writeText(promptText.value);
        showToast('تم نسخ البرومبت');
    } catch (error) {
        document.execCommand('copy');
        showToast('تم نسخ البرومبت');
    }
}
