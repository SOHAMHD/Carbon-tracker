 (function(){
      // elements
      const steps = Array.from(document.querySelectorAll('.step'));
      const sections = Array.from(document.querySelectorAll('form .section[data-step]'));
      const nextBtn = document.getElementById('nextBtn');
      const prevBtn = document.getElementById('prevBtn');
      const submitBtn = document.getElementById('submitBtn');
      const saveDraft = document.getElementById('saveDraft');
      const helpBox = document.getElementById('helpBox');
      const uploadDash = document.getElementById('uploadDash');
      const fileInput = document.getElementById('fileInput');
      const reviewArea = document.getElementById('reviewArea');

      let current = 1;
      const total = sections.length;

      // help contents for each step
      const helpContent = {
        1: `<h4>Company Info</h4>
            <p class="muted">Fill core company fields. Required fields must be completed before moving on.</p>
            <ul><li>Company name, industry and HQ help categorize emissions</li>
            <li>Employee count used for per-capita metrics</li></ul>`,
        2: `<h4>Emissions Data</h4>
            <p class="muted">Provide energy, transport and waste data.</p>
            <ul><li>Use consistent units (kWh, kg CO₂, tons)</li>
            <li>Enter renewable energy percentage if available</li></ul>`,
        3: `<h4>Operations</h4>
            <p class="muted">Operational characteristics used for scaling and modelling.</p>
            <ul><li>Number of facilities, production volume, and operating hours</li></ul>`,
        4: `<h4>Review & Submit</h4>
            <p class="muted">Check entries, upload supporting documents, then submit.</p>`
      };

      function showHelp(step){
        helpBox.innerHTML = helpContent[step] || '';
      }

      function showStep(n){
        current = n;
        sections.forEach(s => {
          const stepNum = Number(s.getAttribute('data-step'));
          s.style.display = (stepNum === n) ? '' : 'none';
        });

        steps.forEach(s => {
          const stepNum = Number(s.dataset.step);
          s.classList.toggle('current', stepNum === n);
          s.classList.toggle('completed', stepNum < n);
        });

        // enable/disable buttons
        prevBtn.disabled = (n === 1);
        nextBtn.style.display = (n === total) ? 'none' : '';
        submitBtn.style.display = (n === total) ? '' : 'none';

        // update help and review area
        showHelp(n);
        if(n === total) populateReview();

        // scroll into view for smaller screens
        const top = document.querySelector('.container').offsetTop;
        window.scrollTo({top: top - 10, behavior:'smooth'});
      }

      // validate required fields in current section
      function validateCurrent(){
        const section = document.querySelector(`form .section[data-step="${current}"]`);
        if(!section) return true;
        const requiredEls = Array.from(section.querySelectorAll('[required]'));
        for(const el of requiredEls){
          if(!el.value || (el.type === 'number' && el.value === '')) {
            el.focus();
            return false;
          }
        }
        return true;
      }

      // next / prev handlers
      nextBtn.addEventListener('click', ()=>{
        if(!validateCurrent()){
          alert('Please complete required fields in this step before continuing.');
          return;
        }
        if(current < total) showStep(current + 1);
      });
      prevBtn.addEventListener('click', ()=> { if(current > 1) showStep(current - 1); });

      // clicking steps (allow clicking only up to next step)
      steps.forEach(s => s.addEventListener('click', ()=>{
        const stepNum = Number(s.dataset.step);
        // allow jumping to steps <= last completed + 1
        const lastCompleted = Math.max(...steps.filter(x => x.classList.contains('completed')).map(x => Number(x.dataset.step)), 1);
        if(stepNum <= lastCompleted + 1){
          showStep(stepNum);
        } else {
          // if trying to jump ahead, validate current first
          if(validateCurrent()) showStep(stepNum);
          else alert('Please finish the current step first.');
        }
      }));

      // save draft (simple localStorage)
      saveDraft.addEventListener('click', ()=>{
        const data = {};
        Array.from(document.querySelectorAll('#multiForm [name]')).forEach(el => data[el.name] = el.value);
        localStorage.setItem('carbonDraft', JSON.stringify(data));
        alert('Draft saved locally.');
      });

      // load draft if present
      (function loadDraft(){
        try {
          const raw = localStorage.getItem('carbonDraft');
          if(!raw) return;
          const data = JSON.parse(raw);
          Object.keys(data).forEach(k => {
            const el = document.querySelector(`[name="${k}"]`);
            if(el) el.value = data[k];
          });
        } catch(e){}
      })();

      // simple submit handler
      submitBtn.addEventListener('click', ()=>{
        // validate last section as well
        if(!validateCurrent()){
          alert('Please complete required fields in this step before submitting.');
          return;
        }
        // collect form data
        const formData = new FormData(document.getElementById('multiForm'));
        // Add file(s)
        const files = fileInput.files;
        for(let i=0;i<files.length;i++) formData.append('files[]', files[i]);

        // demo: show collected summary and simulate submit
        const summary = {};
        for(const pair of formData.entries()){
          const k = pair[0], v = pair[1];
          if(k === 'files[]') continue;
          summary[k] = v;
        }
        alert('Form submitted (demo). Check console for data.');
        console.log('Form submit demo:', summary, files);
        // TODO: POST to backend endpoint using fetch() with multipart/form-data
      });

      // populate review area
      function populateReview(){
        const data = {};
        Array.from(document.querySelectorAll('#multiForm [name]')).forEach(el => data[el.name] = el.value || '');
        let html = '<dl style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
        for(const key in data){
          html += `<div style="padding:8px 0"><strong>${labelize(key)}:</strong><div class="muted">${escapeHtml(data[key])}</div></div>`;
        }
        html += '</dl>';
        reviewArea.innerHTML = html;
      }

      function labelize(k){
        return k.replace(/([A-Z])/g,' $1').replace(/^./, s=>s.toUpperCase());
      }
      function escapeHtml(s){
        if(!s) return '<span style="color:#888">—</span>';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      }

      // upload dash drag/drop & click
      uploadDash.addEventListener('click', ()=> fileInput.click() );
      ['dragenter','dragover'].forEach(e => uploadDash.addEventListener(e, (ev)=> { ev.preventDefault(); uploadDash.style.borderColor = '#bfead9'; uploadDash.style.background='linear-gradient(180deg,#fbfffb,#f6fcf6)'; }));
      ['dragleave','drop'].forEach(e => uploadDash.addEventListener(e, (ev)=> { ev.preventDefault(); uploadDash.style.borderColor = '#e1e7e6'; uploadDash.style.background=''; }));
      uploadDash.addEventListener('drop', (ev)=> {
        ev.preventDefault();
        const files = ev.dataTransfer.files;
        if(files && files.length) handleUploadFiles(files);
      });

      fileInput.addEventListener('change', (ev)=> handleUploadFiles(ev.target.files) );

      function handleUploadFiles(files){
        // basic feedback toast
        const arr = Array.from(files).slice(0,8);
        const names = arr.map(f => f.name).join(', ');
        const toast = document.createElement('div');
        toast.textContent = (arr.length>1) ? (arr.length + ' files selected') : (arr[0] && arr[0].name);
        toast.style.position='fixed'; toast.style.right='20px'; toast.style.bottom='20px';
        toast.style.background='#0b6b3f'; toast.style.color='white'; toast.style.padding='10px 14px'; toast.style.borderRadius='8px'; toast.style.boxShadow='0 6px 18px rgba(11,107,63,0.18)';
        document.body.appendChild(toast);
        setTimeout(()=> toast.remove(), 2200);
      }

      // init
      showStep(1);
      showHelp(1);

      // expose for debugging if needed
      window._formFlow = { showStep };

    })();