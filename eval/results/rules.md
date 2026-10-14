# Eval sonucu: `rules`

Kesin eşleşme: kategori + gold çapasını içeren segment. "Gold dışı" tahminler otomatik olarak yanlış alarm sayılır; bir kısmı gold'da olmayan gerçek riskler olabilir (aşağıda listelenir, elle gözden geçirin).

| Küme | Gold madde | Yakalanan | Kaçırılan | Tahmin | Gold dışı (yanlış alarm) | Kategori karışıklığı | Recall | Precision |
|---|---|---|---|---|---|---|---|---|
| Geliştirme (6 belge) | 59 | 56 | 3 | 234 | 89 | 20 | 95% | 53% |
| Ayrılmış: zoom | 11 | 9 | 2 | 52 | 26 | 9 | 82% | 33% |
| Toplam | 70 | 65 | 5 | 286 | 115 | 29 | 93% | 50% |

## Kategori bazında recall

| Kategori | Gold | Yakalanan |
|---|---|---|
| Otomatik yenileme | 4 | 4 |
| İptal / iade kısıtı | 6 | 6 |
| Tek taraflı fiyat değişikliği | 5 | 5 |
| Sözleşmeyi / hizmeti tek taraflı değiştirme | 8 | 5 |
| Hesabı tek taraflı kapatma / askıya alma | 7 | 7 |
| İçeriğiniz üzerinde geniş lisans / hak devri | 8 | 7 |
| Verilerin / içeriğin yapay zekâ eğitiminde kullanılması | 2 | 2 |
| Verilerin üçüncü taraflarla paylaşımı / satışı | 1 | 1 |
| Kapsamlı veri toplama / izleme / reklam | 4 | 3 |
| Sorumluluk sınırlaması / garanti reddi | 7 | 7 |
| Kullanıcının şirketi tazmin yükümlülüğü | 5 | 5 |
| Dava hakkının kısıtlanması (tahkim, toplu dava feragati, delil şartı) | 6 | 6 |
| Yabancı / uzak yargı yeri ve uygulanacak hukuk | 7 | 7 |

## netflix — recall 89%, precision 60%, durum: uncertain, skor: 91

**Kaçırılan:**
- N6 `unilateral_changes` — "We may, from time to time, change these Terms of Use"

**Yanlış alarm (gold dışı):**
- `ai_training` s9: "While we strive to provide a consistent and high-quality experience, some content or features may be tempor…"
- `ai_training` s20: "(ix) engage in any of the foregoing in connection with the use, creation, development, modification, prompt…"
- `account_termination` s24: "We may suspend or terminate access to any Interactive Feature immediately if you breach these Terms of Use,…"
- `account_termination` s27: "If a payment is not successfully settled, due to expiration, insufficient funds, or otherwise, and you do n…"

**Doğru yer, farklı kategori:**
- `auto_renewal` (gold: N2:cancellation_refund) s31
- `account_termination` (gold: N6:unilateral_changes) s45

## dropbox — recall 90%, precision 63%, durum: uncertain, skor: 95

**Kaçırılan:**
- D1 `content_license` — "this permission extends to our affiliates and trusted third parties"

**Yanlış alarm (gold dışı):**
- `dispute_rights` s78: "Opt out of Agreement to Arbitrate."
- `dispute_rights` s79: "Arbitration Procedures."
- `dispute_rights` s80: "Arbitration Fees and Incentives."
- `liability_limitation` s28: "The disclaimers of warranties and limitations of liability below do not apply to consumers in North Carolin…"
- `account_termination` s40: "We reserve the right to delete or disable content alleged to be infringing and terminate accounts of repeat…"
- `account_termination` s45: "If you don’t pay for your Paid Account on time, we reserve the right to suspend it or remove Paid Account f…"
- `account_termination` s49: "They may also be able to restrict or terminate your access to a Dropbox Team account."
- `account_termination` s55: "If after such notice you fail to take the steps we ask of you, we’ll terminate or suspend your access to th…"
- `liability_limitation` s66: "WE DON’T EXCLUDE OR LIMIT OUR LIABILITY TO YOU WHERE IT WOULD BE ILLEGAL TO DO SO—THIS INCLUDES ANY LIABILI…"

**Doğru yer, farklı kategori:**
- `dispute_rights` (gold: D8:jurisdiction) s75
- `dispute_rights` (gold: D8:jurisdiction) s81
- `unilateral_changes` (gold: D5:account_termination) s51

## github — recall 100%, precision 60%, durum: uncertain, skor: 97

**Kaçırılan:**
- yok

**Yanlış alarm (gold dışı):**
- `ai_training` s15: "AI Features, Training, and Your Data"
- `ai_training` s47: "AI Features, Training, and Your Data"
- `ai_training` s136: "By using automated means to access, collect, or otherwise use (“Access”) any publicly accessible Content fr…"
- `ai_training` s182: "Output may contain material that resembles code or content in the model's training data or that is subject …"
- `liability_limitation` s20: "Disclaimer of Warranties"
- `indemnification` s22: "Release and Indemnification"
- `account_termination` s54: "You may cancel this agreement and close your Account at any time."
- `liability_limitation` s57: "Disclaimer of Warranties"
- `indemnification` s61: "Release and Indemnification"
- `account_termination` s114: "We have the right to remove content or close Accounts if we need to."
- `content_license` s126: "By making a repository public, you grant other Users a nonexclusive, worldwide license to use, display, per…"
- `account_termination` s222: "Short version: You may close your Account at any time."
- `price_change` s250: "any modification, price change, suspension or discontinuance of the Service;"

**Doğru yer, farklı kategori:**
- `data_sharing` (gold: G2:ai_training) s185
- `price_change` (gold: G9:unilateral_changes) s263
- `account_termination` (gold: G9:unilateral_changes) s264

## spotify — recall 91%, precision 40%, durum: uncertain, skor: 99

**Kaçırılan:**
- S10 `unilateral_changes` — "We may make changes to these Terms"

**Yanlış alarm (gold dışı):**
- `dispute_rights` s136: "A party who intends to seek arbitration must first send a written notice of the Dispute ("Notice") to the o…"
- `dispute_rights` s137: "During the Informal Settlement Conference, you and a Spotify representative must both personally participat…"
- `dispute_rights` s138: "If any aspect of this "Pre-arbitration notice of dispute and informal resolution period" section has not be…"
- `dispute_rights` s140: "Neither you nor Spotify may commence an arbitration proceeding until after the Tolling Period has ended."
- `dispute_rights` s142: "Either you or Spotify may start arbitration proceedings."
- `dispute_rights` s143: "If NAM is unavailable, unwilling, or otherwise unable to administer an arbitration in accordance with this …"
- `dispute_rights` s144: "Each party retains the right to request a hearing in arbitration from the arbitrator."
- `dispute_rights` s145: "As in court, any counsel participating in an arbitration certifies that they are complying with the require…"
- `dispute_rights` s146: "Spotify will pay all filing, administration, case-management, hearing, and arbitrator fees ("Arbitration Fe…"
- `dispute_rights` s147: "Regardless of the manner in which the arbitration is conducted, the arbitrator shall issue a reasoned writt…"
- `dispute_rights` s149: "If you elect to have your claim addressed as part of a mass arbitration (defined below), you agree to the a…"
- `dispute_rights` s151: "These mass filing procedures are intended to facilitate the efficient and orderly resolution and settlement…"
- `dispute_rights` s152: "If these mass filing procedures apply to your case, the Tolling Period for your claims will be extended unt…"
- `dispute_rights` s153: "First Stage: In the first stage, counsel for the parties shall each select twenty-five (25) cases per side …"
- `dispute_rights` s156: "Option One: You and Spotify, separately or by agreement, may opt out of arbitration and elect to have your …"
- `dispute_rights` s158: "Assuming the number of remaining cases exceeds two hundred (200), then two hundred (200) cases shall be ran…"
- `dispute_rights` s159: "Throughout the staged process above, the arbitrators for the cases are encouraged to resolve the cases with…"
- `dispute_rights` s160: "A court of competent jurisdiction will have the authority to enforce this "Mass arbitration" section and, i…"
- `dispute_rights` s162: "If in the process of arbitrating or litigating a Dispute this Arbitration Agreement is invalidated in whole…"
- `unilateral_changes` s17: "Please refer to Section 7 below for information about those additional terms and how we may change these Te…"
- `account_termination` s85: "Spotify reserves the right to remove or disable access to any User Content for any or no reason."
- `account_termination` s170: "Unless as otherwise stated in these Terms, should any provision of these Terms be held invalid or unenforce…"
- `data_collection` s96: "Some Content licensed by, provided to, created by, or otherwise made available by Spotify (e.g., podcasts o…"

**Doğru yer, farklı kategori:**
- `dispute_rights` (gold: S8:liability_limitation) s117
- `dispute_rights` (gold: S11:jurisdiction) s124
- `dispute_rights` (gold: S11:jurisdiction) s132
- `unilateral_changes` (gold: S4:price_change) s59
- `unilateral_changes` (gold: S7:account_termination) s108
- `liability_limitation` (gold: S7:account_termination) s108
- `account_termination` (gold: S1:dispute_rights) s166

## discord — recall 100%, precision 30%, durum: uncertain, skor: 99

**Kaçırılan:**
- yok

**Yanlış alarm (gold dışı):**
- `dispute_rights` s122: "IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE OR PARTICIPATE IN A LAWSUIT IN COURT AND LIMITIN…"
- `dispute_rights` s124: "If you have an issue with the services or Discord, you agree that you will reach out to us and use good fai…"
- `dispute_rights` s126: "The Parties further agree that whether a complaining Party has satisfied the requirements of this Informal …"
- `dispute_rights` s128: "Governing Law, Jurisdiction, Class Action Waiver and Time Limitation."
- `dispute_rights` s136: "Agreement to Arbitrate."
- `dispute_rights` s137: "The “Agreement to Arbitrate” includes all provisions following this heading, through and including the para…"
- `dispute_rights` s139: "You and Discord (collectively the “Parties”) agree that this Agreement to Arbitrate is made pursuant to a t…"
- `dispute_rights` s140: "This Agreement to Arbitrate is intended to be interpreted broadly, and it applies to all Disputes between t…"
- `dispute_rights` s143: "‍Arbitration Rules."
- `dispute_rights` s144: "Except as modified by this Agreement to Arbitrate, NAM will administer any arbitration in accordance with t…"
- `dispute_rights` s145: "Except as modified by this Agreement to Arbitrate, ADR Services will administer any arbitration in accordan…"
- `dispute_rights` s146: "If the amount in controversy does not exceed $10,000, and you do not seek injunctive or declaratory relief,…"
- `dispute_rights` s147: "‍Arbitration Costs."
- `dispute_rights` s148: "The Parties agree that the arbitration provider has discretion to modify the amount or timing of any admini…"
- `dispute_rights` s149: "At least 14 days before the date set for an arbitration hearing, any Party may serve an offer in writing up…"
- `dispute_rights` s150: "Arbitration Decision."
- `dispute_rights` s151: "Except as explicitly set forth in this Agreement to Arbitrate, the arbitrator, and not any federal, state o…"
- `dispute_rights` s152: "Arbitration Location."
- `dispute_rights` s154: "For arbitrations before NAM (or any substitute provider for NAM that is agreed upon by the Parties or appoi…"
- `dispute_rights` s155: "You agree to cooperate in good faith with Discord, the arbitrator, and the arbitration provider to implemen…"
- `dispute_rights` s156: "For arbitrations before NAM, the results of the first completely adjudicated batch of demands will be given…"
- `dispute_rights` s157: "Arbitration Proceedings at ADR Services."
- `dispute_rights` s158: "You can decline this Agreement to Arbitrate–and no other provision of these terms–by emailing an opt-out no…"
- `dispute_rights` s159: "The small claims court, and not any arbitrator or arbitration provider, shall have the exclusive authority …"
- `dispute_rights` s161: "If the paragraph titled “Class Arbitration and Collective Relief Waiver,” the paragraph titled “Mass Filing…"
- `dispute_rights` s177: "Any dispute resolution provisions, including the arbitration agreement, such as those under the “Settling d…"
- `data_sharing` s73: "You agree that we may disclose your content to third parties outside of the services when we believe we’re …"
- `liability_limitation` s78: "You agree we will not be liable for any harm caused by that content."
- `content_license` s81: "So long as you comply with these terms, we grant you a worldwide, non-exclusive, personal, non-transferable…"
- `unilateral_changes` s98: "You’re free to stop using Discord’s services at any time and for any reason."
- `account_termination` s98: "You’re free to stop using Discord’s services at any time and for any reason."
- `liability_limitation` s115: "WE DON’T EXCLUDE OR LIMIT OUR LIABILITY TO YOU WHERE IT WOULD BE ILLEGAL TO DO SO."
- `account_termination` s154: "For arbitrations before NAM (or any substitute provider for NAM that is agreed upon by the Parties or appoi…"
- `indemnification` s174: "Any indemnification obligations (as applicable) such as those listed under the “Indemnity” section;"
- `liability_limitation` s175: "Any disclaimer of warranties such as those under the “Services ‘AS IS’” section;"
- `jurisdiction` s152: "For any arbitration conducted, the Parties agree to submit to the personal jurisdiction of any federal or s…"

**Doğru yer, farklı kategori:**
- `dispute_rights` (gold: DC7:jurisdiction) s130
- `dispute_rights` (gold: DC7:jurisdiction) s131
- `dispute_rights` (gold: DC6:unilateral_changes) s163
- `account_termination` (gold: DC1:dispute_rights) s133

## yemeksepeti — recall 100%, precision 88%, durum: uncertain, skor: 96

**Kaçırılan:**
- yok

**Yanlış alarm (gold dışı):**
- `liability_limitation` s53: "Yemeksepeti üye işyerlerinin sağladığı içerikten sorumlu değildir."
- `price_change` s54: "Yemeksepeti sisteminde satışa sunulan ürünlerin fiyat ve ürün özellik bilgilerini değiştirme yükümlülüğü Ye…"
- `unilateral_changes` s78: "Yemeksepeti’nin, tarafınıza tanımlanan Cüzdan Para(lar)’ın bir hata sebebiyle verildiği durumlar dahil olma…"
- `liability_limitation` s141: "Taraflar, öngöremedikleri ve önleyemedikleri ve Sözleşme’den doğan edimlerini direkt olarak etkileyen yangı…"

**Doğru yer, farklı kategori:**
- `data_sharing` (gold: Y3:liability_limitation) s29

## zoom (ayrılmış) — recall 82%, precision 33%, durum: uncertain, skor: 100

**Kaçırılan:**
- Z5 `unilateral_changes` — "Zoom may make modifications, deletions, and additions to this Agreement"
- Z7 `data_collection` — "Zoom owns all rights, title, and interest in and to Service Generated Data"

**Yanlış alarm (gold dışı):**
- `ai_training` s36: "Zoom does not use any of your audio, video, chat, screen sharing, attachments or other communications-like …"
- `dispute_rights` s111: "DISPUTE RESOLUTION, ARBITRATION AGREEMENT, AND CLASS ACTION WAIVER"
- `dispute_rights` s114: "27.2 Exceptions to Arbitration."
- `dispute_rights` s115: "We want to address any Disputes without needing arbitration."
- `dispute_rights` s116: "27.4 Arbitration Procedure."
- `dispute_rights` s117: "The applicable arbitration provider depends on where you live."
- `dispute_rights` s118: "Arbitration hearings will take place through videoconferencing by default, unless you and Zoom agree upon a…"
- `dispute_rights` s119: "If a request to proceed in small claims court (see Section 27.2(1)), is made after an arbitration has been …"
- `dispute_rights` s122: "27.7 Bellwether Arbitrations."
- `dispute_rights` s123: "All parties agree that arbitration demands are of a “substantially similar nature” if they arise out of or …"
- `dispute_rights` s124: "The parties shall work in good faith with the arbitrator to complete each Bellwether Arbitration within one…"
- `dispute_rights` s125: "Following resolution of the Bellwether Arbitrations, the parties agree to engage in a global mediation of a…"
- `dispute_rights` s126: "The parties agree to cooperate in good faith with the arbitration provider to implement the Bellwether Arbi…"
- `dispute_rights` s127: "At least ten (10) calendar days before the date set for the arbitration hearing, you or Zoom may serve a wr…"
- `dispute_rights` s128: "The parties agree that any disputes with respect to settlement offer(s) or offer(s) of judgment in a Mass F…"
- `dispute_rights` s129: "27.9 Arbitration Costs."
- `dispute_rights` s131: "You may reject this Arbitration Agreement and opt out of arbitration by sending an email to opt-out@zoom.us…"
- `dispute_rights` s132: "Except as provided in Section 27.6 above, if any provision of this Arbitration Agreement is found to be ill…"
- `dispute_rights` s156: "All sections of this Agreement which, by their nature should survive termination or expiration, will surviv…"
- `ai_training` s177: "Updates to Section 10 to clarify Zoom’s data usage practices, narrow the scope of Zoom’s licenses and clari…"
- `content_license` s14: "If access to or use of any portion of the Services requires or allows for you to download, use, or install …"
- `content_license` s15: "Subject to the terms and conditions in this Agreement, Zoom grants you a limited, revocable, non-exclusive,…"
- `account_termination` s30: "(xiii) make, use, or offer the Services or Software for lease, rent, or sale, or reproduce, resell, distrib…"
- `account_termination` s64: "You may find information on how to terminate your account and Services located here."
- `indemnification` s96: "INDEMNIFICATION"
- `indemnification` s156: "All sections of this Agreement which, by their nature should survive termination or expiration, will surviv…"

**Doğru yer, farklı kategori:**
- `dispute_rights` (gold: Z5:unilateral_changes) s69
- `dispute_rights` (gold: Z8:liability_limitation) s130
- `dispute_rights` (gold: Z4:account_termination) s139
- `dispute_rights` (gold: Z11:jurisdiction) s149
- `account_termination` (gold: Z8:liability_limitation) s7
- `unilateral_changes` (gold: Z4:account_termination) s50
- `account_termination` (gold: Z5:unilateral_changes) s70
- `indemnification` (gold: Z4:account_termination) s139
- `jurisdiction` (gold: Z10:dispute_rights) s121
