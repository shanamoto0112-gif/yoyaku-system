// ==========================================================
// 現在時刻の赤い線を更新するための【スパイカメラ付き】プログラム
// ==========================================================

function updateCurrentTimeLine() {
  // --- スパイカメラ１：そもそも、この命令は動いているか？ ---
  console.log("【スパイカメラ1】updateCurrentTimeLine、実行開始！");

  // HTMLから id="current-time-line" を持つ要素を探してくる
  const timeline = document.getElementById('current-time-line');
  
  // --- スパイカメラ２：赤い線の「部品」は見つかったか？ ---
  console.log("【スパイカメラ2】HTMLから探した部品:", timeline);

  // もし部品が見つからなければ、致命的なエラーなのでコンソールに記録して中断
  if (!timeline) {
    console.error("【捜査中断】HTMLに id='current-time-line' という部品が見つかりません！");
    return; 
  }

  // 日本の現在時刻を取得（タイムゾーンを明示的に指定）
  const now = new Date();
  const jst = new Date(now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  const hours = jst.getHours();
  const minutes = jst.getMinutes();
  
  // --- スパイカメラ３：時間は正しく取れているか？ ---
  console.log(`【スパイカメラ3】現在の日本時間: ${hours}時 ${minutes}分`);
  
  // スケジュール表の幅と時間帯から1分あたりのpx数を計算（横方向）
  const scheduleBody = document.querySelector('.scheduler-body');
  const scheduleWidth = scheduleBody ? scheduleBody.clientWidth : 600;
  const startHour = 9;
  const endHour = 19;
  const totalMinutes = (endHour - startHour) * 60;
  const pxPerMinute = scheduleWidth / totalMinutes;
  // 線の位置を計算 (9時を基準に、1分ごとにpxPerMinuteずつ右にずらす)
  const leftPosition = ((hours - startHour) * 60 + minutes) * pxPerMinute;

  // --- スパイカメラ４：計算結果は？ ---
  console.log(`【スパイカメラ4】計算された位置(leftPosition): ${leftPosition}px`);

  // 9:00 (0px) から 19:00 (scheduleWidth px) の範囲内かチェック
  if (leftPosition >= 0 && leftPosition <= scheduleWidth) {
    // .time-headerの高さを取得し、その分だけオフセット
  // .time-headerの高さは30pxで固定
  const top = 30;
    // 縦線の高さはスケジュール本体の高さ
    let height = 600;
    if (scheduleBody) {
      // padding/borderも含めて正確な高さを取得
      const style = window.getComputedStyle(scheduleBody);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const borderTop = parseFloat(style.borderTopWidth) || 0;
      const borderBottom = parseFloat(style.borderBottomWidth) || 0;
      height = scheduleBody.clientHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    }
    console.log(`【スパイカメラ5】最終判断→「表示」。CSSのleftを ${leftPosition}px に設定します。`);

    timeline.style.display = 'block';
   // ★★★ 左側ラベルの幅(140px)を足して、基準点を補正する ★★★
                timeline.style.left = `${140 + position}px`;
    timeline.style.top = `${top}px`;
    timeline.style.width = '2px';
    timeline.style.height = height + 'px';
  } else {
    // --- スパイカメラ６：最終判断は「非表示」---
    console.log("【スパイカメラ6】最終判断→「非表示」。営業時間外です。");
    timeline.style.display = 'none';
  }

  console.log("-------------------- 捜査完了 --------------------");
}

// ページが完全に読み込まれたことを確認してから、最初の捜査を開始する
document.addEventListener('DOMContentLoaded', function() {
  updateCurrentTimeLine();
  
  // その後、1分ごとに捜査を継続する
  setInterval(updateCurrentTimeLine, 60000);
});