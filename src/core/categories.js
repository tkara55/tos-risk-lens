// Risk taxonomy. Single source of truth for: the LLM JSON schema enum, the UI labels,
// the rule-based baseline detector, and the deterministic "does the quote support the
// category?" check in validate.js.
//
// `patterns`  - high-precision regexes (EN + TR) used by the rule baseline (rules.js).
// `support`   - looser keyword stems; an LLM finding whose quote matches none of them is
//               kept but marked weak_support (shown as uncertain, half weight in score).

export const SEVERITIES = ['low', 'medium', 'high'];

export const CATEGORIES = {
  auto_renewal: {
    label: 'Otomatik yenileme',
    defaultSeverity: 'medium',
    patterns: [
      /automatic(ally)? (renew|bill|charge)/i, /(auto-?renew|renews? automatically)/i,
      /continue[sd]? (indefinitely )?until (cancel|terminat)/i, /each periodic renewal/i,
      /unless you cancel[^.]{0,80}(charge|bill)/i, /billed on a recurring basis/i,
      /otomatik olarak (yenilen|uzat|tahsil)/i, /iptal edilmedikçe[^.]{0,60}(yenilen|devam)/i,
    ],
    support: [/renew/i, /recurring/i, /until cancel/i, /until terminated/i, /billing (cycle|date|period)/i, /automatic/i, /charge/i, /yenile/i, /otomatik/i, /tahsil/i],
  },
  cancellation_refund: {
    label: 'İptal / iade kısıtı',
    defaultSeverity: 'medium',
    patterns: [
      /non-?refundable/i, /(no|not provide|do not (provide|offer)) refunds?/i, /refunds? (are|will be) (only|not)/i,
      /no refunds? or credits/i, /iade (edilmez|edilemez|edilmeyecek|yapılmaz)/i, /ücret iadesi (ancak|yapmama)/i,
      /cancel[^.]{0,40}(only|must) (through|via|by)/i,
    ],
    support: [/refund/i, /cancel/i, /credit/i, /iade/i, /iptal/i],
  },
  price_change: {
    label: 'Tek taraflı fiyat değişikliği',
    defaultSeverity: 'medium',
    patterns: [
      /change (the |our )?(fees?|price|pricing|subscription fees?)/i, /price (changes?|increases?)/i,
      /(fiyat|ücret|bedel)[^.]{0,60}(değiştir|değişkenlik)/i,
    ],
    support: [/price/i, /fee/i, /pricing/i, /cost/i, /fiyat/i, /ücret/i, /bedel/i],
  },
  unilateral_changes: {
    label: 'Sözleşmeyi / hizmeti tek taraflı değiştirme',
    defaultSeverity: 'medium',
    patterns: [
      /(may|reserve the right to) (modify|amend|change|revise|update) (these|this|the) (terms|agreement)/i,
      /continu(ed|ing) (use|to use)[^.]{0,80}(constitutes?|means|agree|accept)/i,
      /(modify|suspend|discontinue|stop)[^.]{0,40}(the )?(service|website|features?)[^.]{0,40}(without (prior )?notice|at any time)/i,
      /withdrawn without (further )?notice/i,
      /(sözleşme|koşul|şart)[^.]{0,60}(değiştir|güncelle)[^.]{0,40}(hakkı|yapabilir)/i,
      /(önceden )?(haber vermeksizin|bildirimde bulunmaksızın)/i, /dilediği zaman[^.]{0,80}(değiştir|durdur|sona erdir|iptal)/i,
    ],
    support: [/chang/i, /modif/i, /amend/i, /revis/i, /update/i, /discontinu/i, /withdraw/i, /değiş/i, /güncelle/i, /durdur/i, /sona erdir/i],
  },
  account_termination: {
    label: 'Hesabı tek taraflı kapatma / askıya alma',
    defaultSeverity: 'medium',
    patterns: [
      /(suspend|terminate|disable|close)[^.]{0,40}(your )?(account|access)/i,
      /(with or without (cause|notice)|for any reason)/i,
      /(üyeliğ|hesab)[^.]{0,80}(askıya al|sona erdir|kapatma|kısıtla|engelle)/i,
    ],
    support: [/terminat/i, /suspend/i, /disable/i, /close/i, /account/i, /hold/i, /askıya/i, /sona er/i, /kapat/i, /engelle/i, /kısıtla/i],
  },
  content_license: {
    label: 'İçeriğiniz üzerinde geniş lisans / hak devri',
    defaultSeverity: 'medium',
    patterns: [
      /(perpetual|irrevocable|sublicensable|sub-licensable|royalty-free)[^.]{0,80}licen[cs]e/i,
      /grant (us|[A-Z]\w+)[^.]{0,60}(licen[cs]e|right) to (use|store|reproduce)/i,
      /free to use any (comments|feedback|ideas)/i,
      /mali hak[^.]{0,40}devr/i, /telif ücreti talep etmeye/i,
    ],
    support: [/licen[cs]/i, /right/i, /permission/i, /your (content|stuff)/i, /feedback/i, /hak/i, /devr/i, /telif/i, /içerik/i],
  },
  ai_training: {
    label: 'Verilerin / içeriğin yapay zekâ eğitiminde kullanılması',
    defaultSeverity: 'high',
    patterns: [
      /(train|training)[^.]{0,60}(artificial intelligence|machine learning|AI|models?)/i,
      /(artificial intelligence|machine learning|AI)[^.]{0,60}(train|develop and improve)/i,
      /(yapay zek[aâ]|makine öğrenme)[^.]{0,60}(eğit|geliştir)/i,
    ],
    support: [/train/i, /artificial intelligence/i, /machine learning/i, /\bAI\b/, /model/i, /yapay zek/i, /eğit/i],
  },
  data_sharing: {
    label: 'Verilerin üçüncü taraflarla paylaşımı / satışı',
    defaultSeverity: 'medium',
    patterns: [
      /(share|sell|disclose|transfer)[^.]{0,60}(with|to) (our )?(third[- ]part|partners|affiliates|advertisers)/i,
      /(üçüncü (kişi|taraf)|iş ortak)[^.]{0,80}paylaş/i, /paylaş[^.]{0,60}(üçüncü (kişi|taraf)|iş ortak)/i,
    ],
    support: [/share/i, /sell/i, /disclos/i, /third[- ]part/i, /partner/i, /affiliate/i, /paylaş/i, /üçüncü/i, /aktar/i],
  },
  data_collection: {
    label: 'Kapsamlı veri toplama / izleme / reklam',
    defaultSeverity: 'low',
    patterns: [
      /(cookies?|tracking|track you|identify[^.]{0,40}(applications|apps) on your device)/i,
      /(provide|show|serve)[^.]{0,20}advertising/i, /personali[sz]ed (ads|advertising)/i,
      /çerez/i, /(konum|cihaz) (bilgi|veri)[^.]{0,40}topla/i,
    ],
    support: [/collect/i, /cookie/i, /track/i, /advertis/i, /device/i, /monitor/i, /scan/i, /çerez/i, /topla/i, /reklam/i, /izle/i],
  },
  liability_limitation: {
    label: 'Sorumluluk sınırlaması / garanti reddi',
    defaultSeverity: 'medium',
    patterns: [
      /(not|never|no|won['’]t|will not) be (held )?liable/i, /limit(s|ed)? (our|its) (total )?liability/i,
      /provided ["“]?as[- ]is/i, /disclaim[^.]{0,30}warrant/i, /sole and exclusive remedy/i,
      /waive[^.]{0,40}(damages|claims)/i, /(no|have no) liability/i,
      /sorumlu (değildir|olmayacak|tutulamayacak)/i, /sorumluluğu (bulunmamakta|olmayacak)/i, /tazminat talep etmeme/i,
    ],
    support: [/liab/i, /warrant/i, /damage/i, /as[- ]is/i, /remedy/i, /responsib/i, /sorumlu/i, /tazmin/i, /zarar/i, /garanti/i],
  },
  indemnification: {
    label: 'Kullanıcının şirketi tazmin yükümlülüğü',
    defaultSeverity: 'medium',
    patterns: [
      /indemnif/i, /hold [^.]{0,40}harmless/i,
      /(zarar|masraf)[^.]{0,40}(karşılayacağını|tazmin etmekle)/i, /rücu etme/i,
    ],
    support: [/indemn/i, /harmless/i, /defend/i, /karşıla/i, /tazmin/i, /rücu/i, /zarar/i],
  },
  dispute_rights: {
    label: 'Dava hakkının kısıtlanması (tahkim, toplu dava feragati, delil şartı)',
    defaultSeverity: 'high',
    patterns: [
      /arbitrat/i, /class[- ]action/i, /class member/i, /jury trial/i, /representative (action|proceeding)/i,
      /kesin delil/i, /tahkim/i, /toplu dava/i,
    ],
    support: [/arbitrat/i, /class/i, /jury/i, /individual/i, /dispute/i, /claim/i, /tahkim/i, /delil/i, /dava/i, /uyuşmazlık/i],
  },
  jurisdiction: {
    label: 'Yabancı / uzak yargı yeri ve uygulanacak hukuk',
    defaultSeverity: 'low',
    patterns: [
      /governed by[^.]{0,40}laws? of/i, /exclusive (jurisdiction|venue)/i, /(courts?) (located )?in [A-Z]/,
      /(mahkemeleri|icra müdürlükleri) yetkili/i, /kanunlarına tabidir/i,
    ],
    support: [/law/i, /court/i, /jurisdiction/i, /venue/i, /governed/i, /mahkeme/i, /hukuk/i, /kanun/i, /yetkili/i],
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

// Generic plain-Turkish explanations, used when a finding comes from the rule engine
// (no LLM) or as a possible-miss hint. Never presented as clause-specific analysis.
export const GENERIC_EXPLANATION = {
  auto_renewal: 'Abonelik siz iptal edene kadar kendiliğinden yenilenir ve ödeme yönteminizden otomatik tahsilat yapılır.',
  cancellation_refund: 'İptal veya iade imkânı sınırlı; ödediğiniz tutarın bir kısmını geri alamayabilirsiniz.',
  price_change: 'Şirket ücretleri kendisi değiştirebilir; devam ederseniz yeni fiyatı kabul etmiş sayılabilirsiniz.',
  unilateral_changes: 'Şirket koşulları veya hizmeti tek taraflı değiştirebilir; kullanmaya devam etmek kabul sayılabilir.',
  account_termination: 'Şirket hesabınızı kendi değerlendirmesiyle askıya alabilir veya kapatabilir.',
  content_license: 'Paylaştığınız içerik veya geri bildirim üzerinde şirkete geniş kullanım hakkı tanıyorsunuz.',
  ai_training: 'İçeriğiniz veya verileriniz yapay zekâ modellerinin eğitiminde kullanılabilir.',
  data_sharing: 'Verileriniz iş ortakları veya üçüncü taraflarla paylaşılabilir.',
  data_collection: 'Hizmet, cihazınızdan veya kullanımınızdan veri toplar ya da reklam amaçlı kullanır.',
  liability_limitation: 'Bir sorun yaşarsanız şirketin sorumluluğu sınırlıdır veya hizmet "olduğu gibi" sunulur.',
  indemnification: 'Sizin yüzünüzden doğan taleplerde şirketin zararını ve masraflarını karşılamayı kabul ediyorsunuz.',
  dispute_rights: 'Uyuşmazlıklarda mahkemeye gitme, toplu davaya katılma veya delil sunma imkânınız kısıtlanabilir.',
  jurisdiction: 'Uyuşmazlıklarda belirli bir ülkenin hukuku ve belirli bir şehrin mahkemeleri esas alınır.',
};
