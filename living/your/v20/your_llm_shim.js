/* Y.O.U.R. v2.0 · PROPOSAL_HOLD — lets the v1.2.1 dialogue engine (your/modules/your_llm.js) run inside Valence Life.
   YOUR.llm reads YOUR.profile.data and YOUR.day.clock(); here both are views of the Valence save (S.your), filled in by your_v20.js. */
(function () {
  var Y = window.YOUR = window.YOUR || {};
  var view = { data: null };
  Y.profile = { get data() { return view.data ? view.data() : null; }, save: function () { if (view.save) view.save(); }, event: function () {} };
  Y.day = { clock: function () { return view.clock ? view.clock() : '12:00'; } };
  Y.__v20view = view;
})();
