const READY_PROMPT = `You are a professional academic publishing assistant specialized in converting scientific notes into clean internal HTML for strict A4 printable study summaries.

Task:
Convert the text below into internal HTML only.

Strict output rules:
1. Output HTML only. Do not add explanations, comments, Markdown fences, or external text.
2. Do not write <html>, <head>, or <body>.
3. Use exactly one <h1> for the topic title.
4. Use <h2> and <h3> for subheadings.
5. Every main topic block must be wrapped in:
   <section class="content-section">...</section>
6. Do not leave any <h2> or <h3> outside a <section class="content-section">.
7. Each <section class="content-section"> must contain its heading and the content that belongs to that heading together.
8. Use <p> for short paragraphs.
9. Use <ul>, <ol>, and <li> for lists.
10. Use <table> for comparisons, classifications, formulas tables, or compact reference data.
11. Use <blockquote> for important exam notes.
12. Use <div class="exam-box"> for dense MCQ/exam idea collections.
13. If an exam-box contains many points, do not make the whole box one giant paragraph. Put each point in:
    <p class="idea-line">...</p>
14. Use <p class="idea-line"> for compact standalone ideas that should not be separated from themselves during pagination.
15. Use <div class="keep-together">...</div> only for small blocks that must stay together.
16. Do not put a very large block inside keep-together. Large blocks must be split into smaller idea-line paragraphs.
17. Any English term, acronym, technology name, or code-like phrase must be wrapped in:
    <span class="ltr">TERM</span>
18. Do not wrap mathematical equations in class="ltr".
19. Mathematical equations must be written directly in LaTeX:
    - Inline math: \\(O(n \\log n)\\)
    - Display math:
      \\[
      T(n) = O(n \\log n)
      \\]
20. Do not use inline style attributes.
21. Keep the content concise, academic, printable, and suitable for A4 pages.
22. Avoid decorative wording. Prioritize clarity, hierarchy, and exam usefulness.

RTL and mixed inline content rules:
23. The main language is Arabic RTL. Any Arabic step sequence must use the left arrow ←, not the right arrow →.
24. Correct Arabic sequence meaning:
    أرسل 011 ← وصل 111 ← غير صالح ← كشف الخطأ
25. Use → only when the entire line is English or inside a full LTR block.
26. For Arabic step sequences, use class="flow-line" on the <p> or <li>.
27. Binary numbers and short binary tokens must be wrapped in:
    <span class="bit">011</span>
28. English terms must be wrapped in:
    <span class="ltr">Block Coding</span>
29. Short technical labels that need visual emphasis may be wrapped in:
    <span class="codeword">codeword</span>
30. Inline symbols such as =, +, -, XOR, and d_min must be wrapped in:
    <span class="symbol">=</span>
    <span class="symbol">XOR</span>
    <span class="symbol">d_min</span>
31. Success, failure, and warning marks must be wrapped in:
    <span class="status-icon">✅</span>
    <span class="status-icon">❌</span>
    <span class="status-icon">⚠️</span>
32. Do not wrap mathematical equations in .ltr or .symbol.
33. Math equations must stay as MathJax, for example:
    \\(d_{min} = 2t + 1\\)
    or:
    \\[
    d_{min} = 2t + 1
    \\]

Required structure example:
<section class="content-section">
  <h2>Important MCQ Ideas</h2>
  <div class="exam-box">
    <p class="idea-line">1. First idea...</p>
    <p class="idea-line">2. Second idea...</p>
  </div>
</section>

Correct Arabic flow example:
<ul>
  <li class="flow-line">
    أرسل <span class="bit">011</span>
    <span class="arrow">←</span>
    وصل <span class="bit">111</span>
    <span class="arrow">←</span>
    غير صالح
    <span class="arrow">←</span>
    كشف الخطأ <span class="status-icon">✅</span>
  </li>

  <li class="flow-line">
    أرسل <span class="bit">011</span>
    <span class="arrow">←</span>
    وصل <span class="bit">000</span>
    <span class="arrow">←</span>
    صالح
    <span class="arrow">←</span>
    لم يُكتشف <span class="status-icon">❌</span>
  </li>
</ul>

Symbol example:
<p>
  حساب <span class="ltr">Hamming Distance</span>
  يتم بعدّ الخانات المختلفة، وغالباً نستخدم
  <span class="symbol">XOR</span>
  ثم نعد الناتج <span class="bit">1</span>.
</p>

Math example:
<p>
  لتصحيح <span class="symbol">t</span> أخطاء نحتاج:
  \\(d_{min} = 2t + 1\\)
</p>

Text:
[Paste the text here]`;

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
