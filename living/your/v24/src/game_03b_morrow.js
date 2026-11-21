/* ---- v2.4 merge · Morrow City as a district of the main Y.O.U.R. city (owner: publish "v2.4 Living District and Morrow City").
   A Morrow Line gate beside the Transit Depot (Foundry Edge) opens the Morrow City district (METAL: IN DA RIFFT v17 engine + the Y.O.U.R. co-op
   layer, your/morrow/district/morrow_v17.html, from your-build-v24-metal 6654d44) in a full-screen frame. The Living District pauses while you are away
   and resumes when Morrow posts 'your-morrow-exit'. Progress is kept by the Morrow engine's own saves and the shared hero profile (games.your_morrow). */
var MORROW = { x: 60.5, y: 21.5, r: 1.4, overlay: null, lead: null, visits: 0, last: null, wasPaused: false };
L.morrow = MORROW;
function morrowNear() { var p = S.player; return p.mode !== 'car' && hyp(p.x - MORROW.x, p.y - MORROW.y) < MORROW.r; }
function drawMorrowGate() { var t = S.t, X0 = MORROW.x * T, Y0 = MORROW.y * T + 6, near = morrowNear(); cx.save();
  if (!(window.MAP_ART && MAP_ART.drawGate(cx, X0, Y0, near, t))) {
    for (var k = 0; k < 3; k++) { cx.strokeStyle = k === 1 ? 'rgba(201,166,255,.85)' : 'rgba(124,240,224,.75)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(X0, Y0 - 16, 9 + k * 3 + Math.sin(t * 2 + k) * 1.5, 15 + k * 3, 0, 0, 7); cx.stroke(); }
    cx.fillStyle = 'rgba(124,240,224,.18)'; cx.beginPath(); cx.ellipse(X0, Y0 - 16, 9, 15, 0, 0, 7); cx.fill();
  }
  cx.font = '700 9px system-ui'; cx.textAlign = 'center'; var lab = 'MORROW LINE · MORROW CITY · E', w = cx.measureText(lab).width + 8;
  cx.fillStyle = 'rgba(8,10,24,.8)'; cx.fillRect(X0 - w / 2, Y0 - 70, w, 13); cx.fillStyle = '#7cf0e0'; cx.fillText(lab, X0, Y0 - 60); cx.restore(); }
function openMorrow(lead) { if (MORROW.overlay) return false; MORROW.wasPaused = paused; paused = true; save('morrow');
  var ov = document.createElement('div'); ov.id = 'livingMorrowOverlay'; ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#120e16';
  var fr = document.createElement('iframe'); fr.id = 'livingMorrowFrame'; fr.title = 'Morrow City district'; fr.setAttribute('allow', 'gamepad; autoplay');
  fr.style.cssText = 'border:0;width:100%;height:100%;display:block'; fr.src = 'your/morrow/district/morrow_v17.html?lead=' + (lead === 'metal' ? 'metal' : 'hero') + '&from=living';
  ov.appendChild(fr); document.body.appendChild(ov); MORROW.overlay = ov; MORROW.lead = lead; MORROW.visits++; count('morrow_enter_' + lead);
  setTimeout(function () { try { fr.focus(); } catch (e) { } }, 300); return true; }
function closeMorrow(summary) { if (!MORROW.overlay) return; MORROW.overlay.remove(); MORROW.overlay = null; MORROW.last = summary || null; paused = MORROW.wasPaused; count('morrow_exit');
  var s = summary || {}; sim.note('Mella came back from Morrow City (Metal Story ' + (s.finished ? '10/10' : (s.step | 0) + '/10') + ').');
  pop(S.player.x, S.player.y - 1.4, 'BACK FROM MORROW CITY', '#7cf0e0'); }
window.addEventListener('message', function (e) { var d = e.data; if (d && d.type === 'your-morrow-exit') closeMorrow(d.summary); });
