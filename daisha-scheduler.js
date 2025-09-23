    // =======================================================================
        // Firebaseの初期化（新しい方式）
        // =======================================================================
        // 外部ファイルから設定を読み込む
        import { firebaseConfig } from './firebase-config.js';
        
        // Firebaseの機能を読み込む
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
        import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

        // Firebaseを初期化して、Firestoreを使えるように準備する
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        // =======================================================================

        document.addEventListener('DOMContentLoaded', () => {
            // Netlify Identityのチェックを一時的に無効化
            const isEditor = true;

            // 1. 変数と定数の定義
            const carList = ["102", "9572", "1287", "1248", "9047", "サービス代車A", "サービス代車B", "サービス代車C"];
            const totalLanes = carList.length;
            const slotWidth = 30;
            const startHour = 8;
            const startMinute = 30;
            const endHour = 19;
            let currentDate = new Date();
            let allBookings = [];
            let startPicker, endPicker;
            let editingBookingId = null;
            let currentView = 'daily';

            // 2. Firebase(Firestore)機能
            function setupRealtimeListener() {
    const bookingsCollection = collection(db, 'daisha_bookings');
    onSnapshot(bookingsCollection, snapshot => {
        allBookings = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, startDate: doc.data().startDate.toDate(), endDate: doc.data().endDate.toDate() }));
        renderForDate(currentDate);
        updateSuggestionLists();
    }, error => console.error("代車データの取得に失敗: ", error));
}
            async function saveBooking(bookingData) {
    try {
        const dataToSave = { ...bookingData, startDate: Timestamp.fromDate(bookingData.startDate), endDate: Timestamp.fromDate(bookingData.endDate) };
        const docRef = dataToSave.id 
            ? doc(db, 'daisha_bookings', dataToSave.id)
            : doc(collection(db, 'daisha_bookings'));
        if (dataToSave.id) delete dataToSave.id;
        await setDoc(docRef, dataToSave, { merge: true });
        return true;
    } catch (error) { console.error('代車予約の保存に失敗:', error); alert('代車予約の保存に失敗しました。'); return false; }
}
            async function deleteBooking(bookingId) {
    try {
        const docRef = doc(db, 'daisha_bookings', bookingId);
        await deleteDoc(docRef);
        return true;
    } catch (error) { console.error('代車予約の削除に失敗:', error); alert('代車予約の削除に失敗しました。'); return false; }
}
            function clearAllData() { if (confirm('全ての代車予約データを削除しますか？')) { allBookings.forEach(b => deleteBooking(b.id)); } }

            // 3. HTML要素の取得
            const modal = document.getElementById('booking-modal'), bookingForm = document.getElementById('booking-form'), closeButton = document.querySelector('.modal-close-button'), cancelButton = document.getElementById('cancel-button'), infoBoxPlaceholder = document.getElementById('info-box-placeholder'), infoBoxDetails = document.getElementById('info-box-details'), infoBoxCloseButton = document.getElementById('info-box-close-button'), prevDayButton = document.getElementById('prev-day-button'), nextDayButton = document.getElementById('next-day-button'), currentDateDisplay = document.getElementById('current-date-display'), deleteBookingButton = document.getElementById('delete-booking-button'), editBookingButton = document.getElementById('edit-booking-button'), dailyListBody = document.getElementById('daily-list-body'), todayButton = document.getElementById('today-button'), backupButton = document.getElementById('backup-button'), restoreButton = document.getElementById('restore-button'), clearDataButton = document.getElementById('clear-data-button'), restoreFileInput = document.getElementById('restore-file-input'), viewToggleButton = document.getElementById('view-toggle-button'), calendarContainer = document.getElementById('calendar-container'), schedulerContainer = document.getElementById('main-scheduler-container');
            
            // 4. ヘルパー関数とUI構築関数
            function formatDate(d, f) { const y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), a=('0'+d.getDate()).slice(-2), h=('0'+d.getHours()).slice(-2), i=('0'+d.getMinutes()).slice(-2); return f.replace('YYYY',y).replace('MM',m).replace('DD',a).replace('HH',h).replace('mm',i); }
            function updateDateDisplay(d) { currentDateDisplay.textContent = formatDate(d, 'YYYY年MM月DD日'); }
            function openModal(slotInfo, bookingToEdit = null) {
                if (startPicker) startPicker.destroy(); if (endPicker) endPicker.destroy();
                if (bookingToEdit) {
                    editingBookingId = bookingToEdit.id;
                    document.getElementById('user-name').value = bookingToEdit.userName;
                    document.getElementById('lane-select').value = bookingToEdit.lane;
                    startPicker = flatpickr("#start-date-input", { locale: "ja", enableTime: true, time_24hr: true, minuteIncrement: 15, defaultDate: bookingToEdit.startDate });
                    endPicker = flatpickr("#end-date-input", { locale: "ja", enableTime: true, time_24hr: true, minuteIncrement: 15, defaultDate: bookingToEdit.endDate, minDate: bookingToEdit.startDate });
                } else {
                    editingBookingId = null; bookingForm.reset(); const iSD = new Date(currentDate); if (slotInfo) iSD.setHours(slotInfo.hour, slotInfo.minute, 0, 0); const iED = new Date(iSD.getTime() + 36e5); document.getElementById('lane-select').value = slotInfo.lane;
                    startPicker = flatpickr("#start-date-input", { locale: "ja", enableTime: true, time_24hr: true, minuteIncrement: 15, defaultDate: iSD });
                    endPicker = flatpickr("#end-date-input", { locale: "ja", enableTime: true, time_24hr: true, minuteIncrement: 15, defaultDate: iED, minDate: iSD });
                }
                modal.style.display = 'flex';
            }
            function closeModal() { if (startPicker) startPicker.destroy(); if (endPicker) endPicker.destroy(); editingBookingId = null; bookingForm.reset(); modal.style.display = 'none'; }
            function clearSelection() { const s = document.querySelector('.booking-block.selected'); if(s)s.classList.remove('selected'); infoBoxPlaceholder.style.display='block'; infoBoxDetails.style.display='none'; }
            function updateInfoBox(b) {
                clearSelection(); b.classList.add('selected'); const d = b.dataset, sD=new Date(d.startDate), eD=new Date(d.endDate), sT=formatDate(sD,'HH:mm'); let eT=formatDate(eD,'HH:mm'), dED=eD; if(eT==="00:00"&&sD<eD){eT="24:00";dED=new Date(eD-6e4);}
                document.getElementById('info-lane-number').textContent=carList[d.lane-1]; document.getElementById('info-datetime').textContent=`${formatDate(sD,'YYYY/MM/DD')} ${sT} ～ ${formatDate(dED,'YYYY/MM/DD')} ${eT}`; document.getElementById('info-user-name').textContent=d.userName;
                infoBoxPlaceholder.style.display='none'; document.getElementById('info-box-wrapper').classList.remove('is-collapsed'); infoBoxDetails.style.display='block';
            }
            function updateSuggestionLists() { const u = [...new Set(allBookings.map(b => b.userName).filter(Boolean))]; document.getElementById('user-name-list').innerHTML = u.map(n => `<option value="${n}"></option>`).join(''); }
            function buildSchedulerUI() {
                const h=schedulerContainer.querySelector('.time-header'), b=schedulerContainer.querySelector('.scheduler-body'); h.innerHTML='<div class="header-spacer"></div>'; b.innerHTML=''; const tM=(endHour-startHour)*60-startMinute; for(let i=0;i<=Math.ceil(tM/30);i++){const r=startHour+Math.floor((startMinute+i*30)/60),m=(startMinute+i*30)%60;h.innerHTML+=`<div class="half-hour-label">${('0'+r).slice(-2)}:${('0'+m).slice(-2)}</div>`;}
                for(let i=1;i<=totalLanes;i++){
                    const l=document.createElement('div');l.className='lane';l.innerHTML=`<div class="lane-label">${carList[i-1]}</div><div class="time-slots-wrapper" id="lane-wrapper-${i}"></div>`;const w=l.querySelector('.time-slots-wrapper');
                    w.addEventListener('dragover',e=>e.preventDefault());w.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain'),bo=allBookings.find(b=>b.id===id);if(!bo)return;const r=w.getBoundingClientRect(),x=e.clientX-r.left+w.scrollLeft,sI=Math.round(x/slotWidth),nS=new Date(new Date(currentDate).setHours(startHour,startMinute,0,0)+sI*9e5),nE=new Date(nS.getTime()+(bo.endDate-bo.startDate));const o=allBookings.some(b=>b.id!==id&&b.lane===i&&nS<b.endDate&&nE>b.startDate);if(o){alert('他の予約と重複します。');}else{bo.startDate=nS;bo.endDate=nE;bo.lane=i;saveBooking(bo);}});
                    for(let j=0;j<tM/15;j++){const s=document.createElement('div'),r=startHour+Math.floor((startMinute+j*15)/60),m=(startMinute+j*15)%60;s.className='time-slot';s.addEventListener('click',()=>{if(isEditor)openModal({lane:i,hour:r,minute:m});});if(m===0)s.classList.add('solid-line');else if(m===30)s.classList.add('dashed-line');else s.classList.add('dotted-line');w.appendChild(s);}b.appendChild(l);
                }
            }
            function renderDailySchedule(){schedulerContainer.querySelectorAll('.booking-block').forEach(b=>b.remove());dailyListBody.innerHTML='';const sD=new Date(currentDate).setHours(0,0,0,0),eD=new Date(currentDate).setHours(23,59,59,999);const bFD=allBookings.filter(b=>b.startDate<eD&&b.endDate>sD);bFD.sort((a,b)=>a.lane-b.lane||a.startDate-b.startDate).forEach(b=>{createBookingBlock(b);addBookingToList(b);});if(bFD.length===0)dailyListBody.innerHTML='<tr class="no-booking-row"><td colspan="3">本日の予約はありません。</td></tr>';clearSelection();}
            function createBookingBlock(b){const k=document.createElement('div');k.id=b.id;k.className=`booking-block lane-color-${b.lane%8+1}`;k.innerHTML=`<div class="booking-block-content"><div class="booking-block-line1">${b.userName||''}</div></div>`;Object.keys(b).forEach(y=>{if(typeof b[y]!=='object')k.dataset[y]=b[y]});k.dataset.startDate=b.startDate.toISOString();k.dataset.endDate=b.endDate.toISOString();const s=new Date(currentDate).setHours(startHour,startMinute,0,0),e=Math.max(b.startDate,s),d=Math.min(b.endDate,new Date(currentDate).setHours(endHour,0,0,0)),u=(d-e)/6e4;if(u>0){k.style.left=`${((e-s)/9e5)*slotWidth}px`;k.style.width=`${(u/15)*slotWidth}px`;}else{k.style.display='none';}if(b.startDate<s)k.classList.add('starts-before');if(b.endDate>new Date(currentDate).setHours(endHour,0,0,0))k.classList.add('ends-after');addInteractions(k);const w=document.getElementById(`lane-wrapper-${b.lane}`);if(w)w.appendChild(k);}
            function addInteractions(b){b.addEventListener('click',e=>{e.stopPropagation();if(e.currentTarget.classList.contains('selected')){clearSelection();}else{updateInfoBox(e.currentTarget);}});b.draggable=true;b.addEventListener('dragstart',e=>{if(e.target.classList.contains('resizing'))e.preventDefault();e.dataTransfer.setData('text/plain',e.target.id);});}
            function addBookingToList(b){const r=document.createElement('tr');r.innerHTML=`<td>${carList[b.lane-1]}</td><td>${b.userName}</td><td>${formatDate(b.startDate,'MM/DD HH:mm')}～${formatDate(b.endDate,'MM/DD HH:mm')}</td>`;dailyListBody.appendChild(r);}
            function renderForDate(d){currentDate=d;updateDateDisplay(d);renderDailySchedule();}
            function populateCarSelect(){document.getElementById('lane-select').innerHTML=carList.map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');}

            // 5. イベントリスナー
            todayButton.addEventListener('click', () => renderForDate(new Date()));
            prevDayButton.addEventListener('click',()=>{currentDate.setDate(currentDate.getDate()-1);renderForDate(currentDate);});
            nextDayButton.addEventListener('click',()=>{currentDate.setDate(currentDate.getDate()+1);renderForDate(currentDate);});
            viewToggleButton.addEventListener('click',()=>alert('月表示は現在開発中です。'));
            closeButton.addEventListener('click',closeModal);cancelButton.addEventListener('click',closeModal);
            infoBoxCloseButton.addEventListener('click',clearSelection);
            document.getElementById('info-box-header').addEventListener('click', e => { if (!e.target.closest('#info-box-toggle-button')) document.getElementById('info-box-wrapper').classList.toggle('is-collapsed'); });
            document.getElementById('info-box-toggle-button').addEventListener('click', () => document.getElementById('info-box-wrapper').classList.toggle('is-collapsed'));
            
            bookingForm.addEventListener('submit', async (e) => {
                e.preventDefault();const sD=startPicker.selectedDates[0],eD=endPicker.selectedDates[0];if(!sD||!eD||eD<=sD){alert("日時を正しく選択してください。");return;}const tL=parseInt(document.getElementById('lane-select').value,10);const o=allBookings.some(b=>b.id!==editingBookingId&&b.lane===tL&&sD<b.endDate&&eD>b.startDate);if(o){alert("代車の予約が重複しています。");return;}
                const bD={id:editingBookingId,lane:tL,startDate:sD,endDate:eD,userName:document.getElementById('user-name').value};if(await saveBooking(bD))closeModal();
            });
            editBookingButton.addEventListener('click',()=>{const s=document.querySelector('.booking-block.selected');if(s){const b=allBookings.find(b=>b.id===s.id);if(b)openModal(null,b);}});
            deleteBookingButton.addEventListener('click',()=>{const s=document.querySelector('.booking-block.selected');if(s&&confirm("この予約を削除しますか？"))deleteBooking(s.id);});
            currentDateDisplay.addEventListener('click',()=>flatpickr(currentDateDisplay,{locale:"ja",defaultDate:currentDate,onClose:d=>{if(d[0])renderForDate(d[0]);}}).open());

            // 6. 初期化
            buildSchedulerUI(); populateCarSelect(); setupRealtimeListener();
            document.getElementById('info-box-wrapper').classList.add('is-collapsed');
            renderForDate(new Date());
// ==========================================================
            // 現在時刻の赤い線を更新する処理
            // ==========================================================
            function updateCurrentTimeLine() {
              const timeline = document.getElementById('current-time-line');
              if (!timeline) return;

              const now = new Date();
              const minutesFromStart = (now.getHours() - startHour) * 60 + now.getMinutes() - startMinute;
              const position = minutesFromStart * (slotWidth / 15);

              const totalStartMinutes = startHour * 60 + startMinute;
              const totalEndMinutes = endHour * 60;
              const totalNowMinutes = now.getHours() * 60 + now.getMinutes();
              const isBusinessHours = totalNowMinutes >= totalStartMinutes && totalNowMinutes < totalEndMinutes;

              if (isBusinessHours) {
                // ★★★ 左側ラベルの幅(140px)を足して、基準点を補正する ★★★
                timeline.style.left = `${140 + position}px`;
                timeline.style.display = 'block';
              } else {
                timeline.style.display = 'none';
              }
            }

            // ページが読み込まれたら、まず一度すぐに実行する
            updateCurrentTimeLine();

            // その後、1分ごと(60000ミリ秒)に、繰り返し実行し続けるタイマー
            setInterval(updateCurrentTimeLine, 60000);
        });