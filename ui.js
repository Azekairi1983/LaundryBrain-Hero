(function(){
  // UI wiring extracted from Index.html
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof populateEquipmentTables === 'function') populateEquipmentTables();
    if (typeof populateEquipmentCostTable === 'function') populateEquipmentCostTable();
    if (typeof updateProjectCost === 'function') updateProjectCost();
    if (typeof compute === 'function') compute();

    // Auto Market: press Enter in ZIP field to run; also trigger (debounced) on typing.
    const _az = document.getElementById('autoZip');
    if (_az) {
      _az.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') {
        if (typeof autoFillUSMarket === 'function') autoFillUSMarket();
      }});
      _az.addEventListener('input', (ev) => {
        clearTimeout(window._autoZipTimer);
        window._autoZipTimer = setTimeout(() => {
          const v = _az.value || "";
          if ((v||"").trim().length >= 5) {
            if (typeof autoFillUSMarket === 'function') autoFillUSMarket();
          }
        }, 420);
      });
    }

    // Auto Market: wire button defensively to toggle sliders
    const _ab = document.getElementById('autoFillBtn');
    if (_ab) _ab.addEventListener('click', () => {
      const panel = document.getElementById('marketSliderPanel');
      if (!panel) return;
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      const status = document.getElementById('autoMarketStatus');
      if (status) status.textContent = panel.style.display === 'none' ? 'Sliders hidden.' : 'Using market sliders (manual inputs)';
    });

    // Slider -> sync function
    window.updateMarketFromSliders = function(){
      const rEl = document.getElementById('sliderRenter');
      const pEl = document.getElementById('sliderPricing');
      const cEl = document.getElementById('sliderCompetitors');
      if (!rEl || !pEl || !cEl) return;
      const r = +rEl.value || 0;
      const p = +pEl.value || 5;
      const c = +cEl.value || 0;
      const rs = document.getElementById('sliderRenterVal'); if (rs) rs.value = r;
      const ps = document.getElementById('sliderPricingVal'); if (ps) ps.value = p;
      const cs = document.getElementById('sliderCompetitorsVal'); if (cs) cs.value = c;
      if (document.getElementById('renterScore')) document.getElementById('renterScore').value = r;
      if (document.getElementById('pricingPower')) document.getElementById('pricingPower').value = p;
      if (document.getElementById('competitors')) document.getElementById('competitors').value = c;
      if (typeof deferredCompute === 'function') deferredCompute();
      else if (typeof compute === 'function') compute();
    };

    // Global click debug for Auto Market
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.id === 'autoFillBtn') {
        const s = document.getElementById('autoMarketStatus');
        if (s && s.textContent === 'Not run yet.') s.textContent = 'Click detected (debug)…';
      }
    }, true);
  });
})();
