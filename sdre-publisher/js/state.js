let state = {
    subject: '',
    chapter: '',
    year: '2026',
    pages: [
        {
            topic: 'مقدمة في الخوارزميات',
            content: '<h1>مقدمة في الخوارزميات</h1><p>الخوارزمية هي مجموعة خطوات مرتبة لحل مشكلة محددة بكفاءة ووضوح.</p><h2>قياس الكفاءة</h2><p>نستخدم التعقيد الزمني للتعبير عن سرعة النمو مثل \\(O(n \\log n)\\).</p><blockquote>ملاحظة امتحانية: ركز على الفرق بين التعقيد الزمني والتعقيد المكاني.</blockquote><table><thead><tr><th>المفهوم</th><th>المعنى</th></tr></thead><tbody><tr><td><span class="ltr">Time Complexity</span></td><td>عدد العمليات مع زيادة حجم الإدخال</td></tr><tr><td><span class="ltr">Space Complexity</span></td><td>الذاكرة المطلوبة أثناء التنفيذ</td></tr></tbody></table><pre><code>for (let i = 0; i &lt; n; i++) {\n    console.log(i);\n}</code></pre>'
        }
    ]
};

let editingIndex = -1;
