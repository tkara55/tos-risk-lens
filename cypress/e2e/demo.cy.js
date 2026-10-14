// Demo video (≤ 90 s): 1) happy path, 2) the system honestly showing uncertainty,
// 3) prompt-injection test. Runs against the demo harness, which uses the same extract.js,
// pipeline and report UI as the extension side panel.
//
// Default: replayed model responses (deterministic). With CYPRESS_ANTHROPIC_API_KEY set,
// the real API is called and only behaviour that does not depend on wording is asserted.

const LIVE = Boolean(Cypress.env('ANTHROPIC_API_KEY'));
// Exact-outcome assertions only hold for the hand-written replay files; recorded or live
// model output is checked for behaviour (grounded quotes, injection handling) only.
const scripted = {};
const PAUSE = 4200;

function caption(text) {
  cy.document().then((doc) => {
    let bar = doc.getElementById('cy-caption');
    if (!bar) {
      bar = doc.createElement('div');
      bar.id = 'cy-caption';
      Object.assign(bar.style, { position: 'fixed', left: '12px', bottom: '12px', maxWidth: '760px', zIndex: 9999, background: 'rgba(20,24,32,.92)', color: '#fff', font: '600 15px/1.4 system-ui, sans-serif', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,.3)' });
      doc.body.append(bar);
    }
    bar.textContent = text;
  });
}

function analyzeFixture(cyName, fixture) {
  cy.get(`[data-cy=${cyName}]`).click();
  cy.get('#frame').its('0.contentDocument.location.pathname').should('include', fixture);
  cy.get('#frame').its('0.contentDocument.readyState').should('eq', 'complete');
  cy.get('[data-cy=analyze]').click();
  cy.get('[data-cy=score-card]', { timeout: LIVE ? 180000 : 15000 }).should('be.visible');
}

describe('Sözleşme Risk Merceği — demo', () => {
  before(() => {
    for (const f of ['akistv-kosullar', 'bulutnot-gizlilik', 'hizlikargo-enjeksiyon']) {
      cy.readFile(`demo/replay/${f}.json`).then((r) => { scripted[f] = !LIVE && r.origin === 'handwritten'; });
    }
  });

  beforeEach(() => {
    cy.visit('/?fixture=akistv-kosullar', {
      onBeforeLoad(win) { if (LIVE) win.__liveKey = Cypress.env('ANTHROPIC_API_KEY'); },
    });
  });

  it('mutlu yol, belirsizlik ve prompt injection', () => {
    // ---- 1. Happy path -----------------------------------------------------
    cy.get('[data-cy=disclaimer]').should('be.visible').and('contain.text', 'hukuki tavsiye vermez');
    caption('1/3 · Mutlu yol: hayali bir yayın hizmetinin kullanım koşulları. Uyarı her zaman görünür: bu araç hukuki tavsiye vermez.');
    cy.wait(PAUSE);
    analyzeFixture('fx-akistv', 'akistv-kosullar');
    cy.get('[data-cy=finding]').should('have.length.at.least', 3);
    cy.get('[data-cy=finding] [data-cy=quote]').each(($q) => expect($q.text().trim().length).to.be.greaterThan(20));
    if (scripted['akistv-kosullar']) {
      cy.get('[data-cy=status]').should('have.text', 'Doğrulanmış sonuç');
      cy.get('[data-cy=score]').invoke('text').then((t) => expect(parseInt(t, 10)).to.be.at.least(60));
    }
    caption('Her madde, sayfadaki metinden birebir alıntıyla gösteriliyor. Skor modelden değil, doğrulanmış maddelerden kodla hesaplanıyor.');
    cy.wait(PAUSE);
    cy.get('[data-cy=finding] button').first().click();
    cy.get('#frame').its('0.contentDocument').find('.__tos_lens_highlight').should('exist');
    caption('"Sayfada göster": alıntının geldiği paragraf sayfada işaretleniyor.');
    cy.wait(PAUSE);

    // ---- 2. Honest uncertainty ---------------------------------------------
    caption('2/3 · Muğlak ve eksik bir gizlilik metni: koşulların çoğu başka belgelere havale edilmiş.');
    analyzeFixture('fx-bulutnot', 'bulutnot-gizlilik');
    if (scripted['bulutnot-gizlilik']) {
      cy.get('[data-cy=status]').should('have.text', 'Belirsiz sonuç');
      cy.get('[data-cy=uncertainty] [data-code=rejected_claims]').should('be.visible');
    }
    cy.get('[data-cy=uncertainty]').scrollIntoView();
    caption('Sistem emin olmadığını açıkça söylüyor: modelin "otomatik yenileme" iddiası metinde yok, bu yüzden atıldı; değerlendirilemeyen konular listeleniyor.');
    cy.wait(PAUSE + 1400);
    if (scripted['bulutnot-gizlilik']) {
      cy.get('[data-cy=rejected] summary').scrollIntoView().click();
      cy.get('[data-reject=UNGROUNDED_QUOTE]').scrollIntoView().should('be.visible');
      caption('Atılan iddia gizlenmiyor: neden reddedildiği ve modelin uydurduğu cümle üstü çizili gösteriliyor.');
      cy.wait(PAUSE);
    }
    cy.get('[data-cy=not-assessable]').scrollIntoView();
    cy.wait(PAUSE - 600);

    // ---- 3. Prompt injection -------------------------------------------------
    caption('3/3 · Prompt injection testi: sayfada gizli (display:none, ekran dışı, beyaz-üstüne-beyaz) ve görünür talimatlar var.');
    analyzeFixture('fx-hizlikargo', 'hizlikargo-enjeksiyon');
    cy.get('[data-cy=injection]').should('be.visible').and('contain.text', 'gizli metin');
    cy.window().its('__lastPage.hidden').should('have.length.at.least', 3);
    if (scripted['hizlikargo-enjeksiyon']) {
      cy.get('[data-cy=status]').should('have.text', 'Belirsiz sonuç');
      cy.get('[data-cy=score]').invoke('text').then((t) => expect(parseInt(t, 10)).to.be.at.least(60));
      cy.get('[data-cy=finding]').contains('şiddet yükseltildi').should('exist');
    }
    cy.get('[data-cy=injection]').scrollIntoView();
    caption('Gizli talimatlar modele hiç gönderilmedi; görünür talimattan alıntı kabul edilmedi; "skor 0" talebi işe yaramadı çünkü skoru kod hesaplıyor.');
    cy.wait(PAUSE + 1400);
    cy.get('[data-cy=findings]').scrollIntoView();
    caption('Satış maddesinin şiddeti model tarafından düşürülmüştü; enjeksiyon şüphesinde şiddet kategori tabanının altına inemez.');
    cy.wait(PAUSE + 600);
  });
});
