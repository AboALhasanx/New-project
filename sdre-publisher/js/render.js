function escHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderAll() {
    const subjectInput = document.getElementById('subjectInput');
    const chapterInput = document.getElementById('chapterInput');
    const yearInput = document.getElementById('yearInput');
    const projectName = document.getElementById('projectName');
    const preview = document.getElementById('bookPreview');
    const subject = state.subject.trim() || 'اسم المادة';
    const chapter = state.chapter.trim() || 'اسم الفصل';
    const year = state.year.trim() || '2026';

    subjectInput.value = state.subject;
    chapterInput.value = state.chapter;
    yearInput.value = state.year;
    projectName.textContent = state.subject.trim() ? state.subject.trim() : 'مشروع جديد';

    preview.innerHTML = `
        <article class="a4-page cover-page">
            <div class="cover-inner">
                <div class="cover-kicker">SDRE Publisher</div>
                <h1>ملخص الفصل</h1>
                <div class="cover-line"></div>
                <div class="cover-meta">
                    <p><span>المادة</span><strong>${escHtml(subject)}</strong></p>
                    <p><span>الفصل</span><strong>${escHtml(chapter)}</strong></p>
                    <p><span>السنة</span><strong>${escHtml(year)}</strong></p>
                </div>
            </div>
        </article>
        ${state.pages.map((page, index) => renderTopicPageHtml(page, index, chapter)).join('')}
    `;

    renderPageList();
    typesetPaginateAndCheckOverflow();
}

function renderTopicPageHtml(page, index, chapter) {
    return `
        <article class="a4-page topic-page" data-source-index="${index}" data-topic="${escHtml(page.topic || 'موضوع بدون عنوان')}" data-chapter="${escHtml(chapter)}">
            <header class="page-header">
                <div class="header-topic">${escHtml(page.topic || 'موضوع بدون عنوان')} - ${escHtml(chapter)}</div>
                <div class="header-count">صفحة</div>
            </header>
            <section class="page-body">${page.content || ''}</section>
        </article>
    `;
}

function renderPageList() {
    const pageList = document.getElementById('pageList');

    if (!state.pages.length) {
        pageList.innerHTML = '<div class="empty-list">لا توجد صفحات بعد.</div>';
        return;
    }

    pageList.innerHTML = state.pages.map((page, index) => `
        <article class="page-list-item">
            <div class="page-list-title">
                <span>${index + 1}</span>
                <strong>${escHtml(page.topic || 'موضوع بدون عنوان')}</strong>
            </div>
            <div class="page-list-actions">
                <button type="button" title="تعديل" aria-label="تعديل" onclick="openEditModal(${index})">تعديل</button>
                <button type="button" title="تحريك للأعلى" aria-label="تحريك للأعلى" onclick="movePage(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" title="تحريك للأسفل" aria-label="تحريك للأسفل" onclick="movePage(${index}, 1)" ${index === state.pages.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="danger-text" title="حذف" aria-label="حذف" onclick="deletePage(${index})">حذف</button>
            </div>
        </article>
    `).join('');
}

function typesetPaginateAndCheckOverflow() {
    const preview = document.getElementById('bookPreview');

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([preview])
            .then(() => {
                paginateBook();
                checkOverflow();
            })
            .catch((error) => {
                console.error('MathJax typeset failed:', error);
                paginateBook();
                checkOverflow();
            });
        return;
    }

    paginateBook();
    checkOverflow();
}

function paginateBook() {
    let page = document.querySelector('.topic-page');
    let guard = 0;

    while (page && guard < 500) {
        guard += 1;

        const body = page.querySelector('.page-body');
        if (!body) {
            page = nextTopicPage(page);
            continue;
        }

        if (isVerticallyOverflowing(body)) {
            const moved = moveOverflowToContinuation(page);
            if (!moved) {
                page = nextTopicPage(page);
            }
            continue;
        }

        page = nextTopicPage(page);
    }

    updateRenderedPageNumbers();
}

function nextTopicPage(page) {
    let next = page.nextElementSibling;
    while (next && !next.classList.contains('topic-page')) {
        next = next.nextElementSibling;
    }
    return next;
}

function isVerticallyOverflowing(body) {
    return Math.ceil(body.scrollHeight) > Math.ceil(body.clientHeight) + 1;
}

function moveOverflowToContinuation(page) {
    const body = page.querySelector('.page-body');
    const nextPage = getOrCreateContinuationPage(page);
    const nextBody = nextPage.querySelector('.page-body');
    let moved = 0;

    while (isVerticallyOverflowing(body) && body.childNodes.length > 1) {
        nextBody.insertBefore(body.lastChild, nextBody.firstChild);
        moved += 1;
    }

    if (isVerticallyOverflowing(body) && body.childNodes.length === 1 && !nextBody.childNodes.length) {
        return false;
    }

    return moved > 0;
}

function getOrCreateContinuationPage(page) {
    const sourceIndex = page.dataset.sourceIndex;
    const next = page.nextElementSibling;

    if (
        next &&
        next.classList.contains('topic-page') &&
        next.dataset.sourceIndex === sourceIndex &&
        next.dataset.generated === 'true'
    ) {
        return next;
    }

    const continuation = document.createElement('article');
    continuation.className = 'a4-page topic-page';
    continuation.dataset.sourceIndex = sourceIndex;
    continuation.dataset.topic = page.dataset.topic || '';
    continuation.dataset.chapter = page.dataset.chapter || '';
    continuation.dataset.generated = 'true';

    const header = document.createElement('header');
    header.className = 'page-header';

    const topic = document.createElement('div');
    topic.className = 'header-topic';
    topic.textContent = `${continuation.dataset.topic || 'موضوع بدون عنوان'} - ${continuation.dataset.chapter || 'اسم الفصل'}`;

    const count = document.createElement('div');
    count.className = 'header-count';
    count.textContent = 'صفحة';

    const body = document.createElement('section');
    body.className = 'page-body';

    header.append(topic, count);
    continuation.append(header, body);
    page.after(continuation);

    return continuation;
}

function updateRenderedPageNumbers() {
    const pages = Array.from(document.querySelectorAll('.topic-page'));
    const total = pages.length;

    pages.forEach((page, index) => {
        const count = page.querySelector('.header-count');
        if (count) {
            count.textContent = `صفحة ${index + 1} / ${total}`;
        }
    });
}

function checkOverflow() {
    const bodies = document.querySelectorAll('.page-body');

    bodies.forEach((body) => {
        const page = body.closest('.a4-page');
        if (!page) {
            return;
        }

        page.classList.remove('has-overflow');
        if (body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1) {
            page.classList.add('has-overflow');
        }
    });
}
