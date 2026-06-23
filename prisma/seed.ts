import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── 既存データ全削除（依存順）──────────────────────────
  await prisma.chatMessageRead.deleteMany()
  await prisma.chatReaction.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.chatRoom.deleteMany()
  await prisma.drawingPin.deleteMany()
  await prisma.drawingVersion.deleteMany()
  await prisma.drawing.deleteMany()
  await prisma.photo.deleteMany()
  await prisma.inspectionItem.deleteMany()
  await prisma.defect.deleteMany()
  await prisma.inspection.deleteMany()
  await prisma.paymentRecord.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.estimateItem.deleteMany()
  await prisma.estimate.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.dailyReport.deleteMany()
  await prisma.workReport.deleteMany()
  await prisma.siteDiary.deleteMany()
  await prisma.kyActivity.deleteMany()
  await prisma.nearMiss.deleteMany()
  await prisma.safetyPatrol.deleteMany()
  await prisma.workerAttendance.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.bid.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.workOrder.deleteMany()
  await prisma.document.deleteMany()
  await prisma.documentFolder.deleteMany()
  await prisma.project.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.user.deleteMany()
  await prisma.company.deleteMany()
  console.log('Existing data cleared')

  // ── 会社 ──────────────────────────────────────────────
  const company = await prisma.company.create({
    data: {
      name: '株式会社建設テック',
      kanaName: 'カブシキガイシャケンセツテック',
      type: '元請',
      address: '東京都渋谷区道玄坂1-1-1 建設テックビル5F',
      postalCode: '150-0043',
      prefecture: '東京都',
      phone: '03-1234-5678',
      email: 'info@kensetsu-tech.co.jp',
      representativeName: '代表取締役 山本 健太',
      registrationNumber: 'T1234567890123',
      bankName: '三菱UFJ銀行',
      bankBranch: '渋谷支店',
      bankAccountType: '普通',
      bankAccountNumber: '1234567',
      bankAccountName: 'ケンセツテック',
    },
  })

  // ── ユーザー ──────────────────────────────────────────
  const pw = await bcrypt.hash('pass1234', 10)
  const adminPw = await bcrypt.hash('admin1234', 10)

  const admin = await prisma.user.create({
    data: { email: 'admin@buildsync.jp', password: adminPw, name: '管理者 太郎', role: '管理者', companyId: company.id },
  })
  const supervisor1 = await prisma.user.create({
    data: { email: 'tanaka@buildsync.jp', password: pw, name: '田中 一郎', role: '現場監督', companyId: company.id },
  })
  const supervisor2 = await prisma.user.create({
    data: { email: 'suzuki@buildsync.jp', password: pw, name: '鈴木 健司', role: '現場監督', companyId: company.id },
  })
  const office = await prisma.user.create({
    data: { email: 'sato@buildsync.jp', password: pw, name: '佐藤 花子', role: '事務担当', companyId: company.id },
  })
  const sales = await prisma.user.create({
    data: { email: 'yamada@buildsync.jp', password: pw, name: '山田 次郎', role: '営業', companyId: company.id },
  })
  const worker = await prisma.user.create({
    data: { email: 'ito@buildsync.jp', password: pw, name: '伊藤 三郎', role: '職人', companyId: company.id },
  })

  console.log('Users created')

  // ── 顧客 20件 ─────────────────────────────────────────
  const customerData = [
    { name: '山田建設株式会社', type: '法人', address: '東京都新宿区西新宿2-1-1', phone: '03-2345-6789', email: 'yamada@yamada-kensetsu.co.jp' },
    { name: '鈴木産業株式会社', type: '法人', address: '東京都千代田区丸の内1-1-1', phone: '03-3456-7890', email: 'suzuki@suzuki-sangyo.co.jp' },
    { name: '田中工業株式会社', type: '法人', address: '神奈川県横浜市中区山下町1-1', phone: '045-123-4567', email: 'tanaka@tanaka-kogyo.co.jp' },
    { name: '佐藤不動産株式会社', type: '法人', address: '東京都港区赤坂3-3-3', phone: '03-4567-8901', email: 'sato@sato-realestate.co.jp' },
    { name: '高橋ホールディングス株式会社', type: '法人', address: '大阪府大阪市北区梅田1-1-1', phone: '06-1234-5678', email: 'takahashi@takahashi-hd.co.jp' },
    { name: '伊藤建材株式会社', type: '法人', address: '愛知県名古屋市中区栄3-1-1', phone: '052-123-4567', email: 'ito@ito-kenzai.co.jp' },
    { name: '渡辺ハウス株式会社', type: '法人', address: '埼玉県さいたま市大宮区宮町1-1', phone: '048-123-4567', email: 'watanabe@watanabe-house.co.jp' },
    { name: '中村商事株式会社', type: '法人', address: '千葉県千葉市中央区富士見1-1-1', phone: '043-123-4567', email: 'nakamura@nakamura-shoji.co.jp' },
    { name: '小林デベロップメント株式会社', type: '法人', address: '福岡県福岡市博多区博多駅前1-1-1', phone: '092-123-4567', email: 'kobayashi@kobayashi-dev.co.jp' },
    { name: '加藤リフォーム株式会社', type: '法人', address: '神奈川県川崎市川崎区東田町1-1', phone: '044-123-4567', email: 'kato@kato-reform.co.jp' },
    { name: '吉田 太郎', type: '個人', address: '東京都世田谷区三軒茶屋1-1-1', phone: '090-1234-5678', email: 'yoshida@example.com' },
    { name: '山本 花子', type: '個人', address: '神奈川県横浜市青葉区青葉台1-1-1', phone: '090-2345-6789', email: 'yamamoto@example.com' },
    { name: '松本 一郎', type: '個人', address: '東京都杉並区荻窪1-1-1', phone: '090-3456-7890', email: 'matsumoto@example.com' },
    { name: '井上建設株式会社', type: '法人', address: '東京都江東区豊洲3-3-3', phone: '03-5678-9012', email: 'inoue@inoue-kensetsu.co.jp' },
    { name: '木村工務店株式会社', type: '法人', address: '神奈川県相模原市中央区中央1-1-1', phone: '042-123-4567', email: 'kimura@kimura-koumuten.co.jp' },
    { name: '林不動産開発株式会社', type: '法人', address: '東京都品川区大崎1-1-1', phone: '03-6789-0123', email: 'hayashi@hayashi-fudosan.co.jp' },
    { name: '清水建設工業株式会社', type: '法人', address: '東京都中央区銀座1-1-1', phone: '03-7890-1234', email: 'shimizu@shimizu-kensetsu.co.jp' },
    { name: '橋本住宅株式会社', type: '法人', address: '埼玉県川越市脇田町1-1', phone: '049-123-4567', email: 'hashimoto@hashimoto-jutaku.co.jp' },
    { name: '斎藤工業株式会社', type: '法人', address: '千葉県船橋市本町1-1-1', phone: '047-123-4567', email: 'saito@saito-kogyo.co.jp' },
    { name: '長谷川 健太', type: '個人', address: '東京都練馬区石神井町1-1-1', phone: '090-4567-8901', email: 'hasegawa@example.com' },
  ]
  const customers = await Promise.all(
    customerData.map(d => prisma.customer.create({ data: { ...d, companyId: company.id } }))
  )
  console.log('Customers created:', customers.length)

  // ── 協力会社 20件 ─────────────────────────────────────
  const supplierData = [
    { name: '東京内装工業株式会社', type: '協力会社', address: '東京都板橋区板橋1-1-1', phone: '03-1111-1111', email: 'tokyo-naiso@example.co.jp' },
    { name: '関東鉄筋工業株式会社', type: '協力会社', address: '埼玉県川口市本町1-1-1', phone: '048-111-1111', email: 'kanto-tekkin@example.co.jp' },
    { name: '神奈川電気工事株式会社', type: '協力会社', address: '神奈川県横浜市保土ケ谷区1-1-1', phone: '045-111-1111', email: 'kanagawa-denki@example.co.jp' },
    { name: '首都圏配管株式会社', type: '協力会社', address: '東京都足立区千住1-1-1', phone: '03-2222-2222', email: 'shutoken-haikan@example.co.jp' },
    { name: '日本塗装株式会社', type: '協力会社', address: '東京都荒川区西尾久1-1-1', phone: '03-3333-3333', email: 'nippon-tosou@example.co.jp' },
    { name: '関東足場工業株式会社', type: '協力会社', address: '埼玉県草加市青柳1-1-1', phone: '048-222-2222', email: 'kanto-ashiba@example.co.jp' },
    { name: '東日本解体株式会社', type: '協力会社', address: '千葉県市川市行徳駅前1-1-1', phone: '047-111-1111', email: 'higashinihon-kaitai@example.co.jp' },
    { name: '首都圏左官工業株式会社', type: '協力会社', address: '東京都葛飾区新小岩1-1-1', phone: '03-4444-4444', email: 'shutoken-sakan@example.co.jp' },
    { name: '東京タイル工事株式会社', type: '協力会社', address: '東京都江戸川区西葛西1-1-1', phone: '03-5555-5555', email: 'tokyo-tile@example.co.jp' },
    { name: '関東防水工業株式会社', type: '協力会社', address: '神奈川県川崎市幸区1-1-1', phone: '044-111-1111', email: 'kanto-bosui@example.co.jp' },
    { name: '首都圏空調設備株式会社', type: '協力会社', address: '東京都北区王子1-1-1', phone: '03-6666-6666', email: 'shutoken-kuchou@example.co.jp' },
    { name: '関東大工工業株式会社', type: '協力会社', address: '埼玉県越谷市越谷1-1-1', phone: '048-333-3333', email: 'kanto-daiku@example.co.jp' },
    { name: '東京ガラス工事株式会社', type: '協力会社', address: '東京都墨田区押上1-1-1', phone: '03-7777-7777', email: 'tokyo-glass@example.co.jp' },
    { name: '首都圏型枠工業株式会社', type: '協力会社', address: '神奈川県相模原市南区1-1-1', phone: '042-111-1111', email: 'shutoken-katawaku@example.co.jp' },
    { name: '東日本土工株式会社', type: '協力会社', address: '千葉県松戸市松戸1-1-1', phone: '047-222-2222', email: 'higashinihon-doko@example.co.jp' },
    { name: '関東鳶工業株式会社', type: '協力会社', address: '埼玉県三郷市1-1-1', phone: '048-444-4444', email: 'kanto-tobi@example.co.jp' },
    { name: '東京石工事株式会社', type: '協力会社', address: '東京都練馬区石神井台1-1-1', phone: '03-8888-8888', email: 'tokyo-ishi@example.co.jp' },
    { name: '首都圏建具工業株式会社', type: '協力会社', address: '神奈川県厚木市中町1-1-1', phone: '046-111-1111', email: 'shutoken-tategu@example.co.jp' },
    { name: '関東屋根工事株式会社', type: '協力会社', address: '埼玉県春日部市春日部1-1-1', phone: '048-555-5555', email: 'kanto-yane@example.co.jp' },
    { name: '東京外構工事株式会社', type: '協力会社', address: '東京都杉並区高円寺1-1-1', phone: '03-9999-9999', email: 'tokyo-gaiko@example.co.jp' },
  ]
  const suppliers = await Promise.all(
    supplierData.map(d => prisma.supplier.create({ data: { ...d, companyId: company.id } }))
  )
  console.log('Suppliers created:', suppliers.length)

  // ── 案件 20件 ─────────────────────────────────────────
  const statusList = ['施工中', '施工中', '施工中', '完工', '完工', '検査中', '検査中', '引合', '引合', '商談中', '商談中', '見積中', '受注', '施工中', '完工', '施工中', '引合', '見積中', '受注', '施工中']
  const workTypes = ['改修工事', '新築工事', 'リノベーション', '内装工事', '塗装工事', '解体工事', '外構工事', '屋根工事', '設備工事', '電気工事']
  const projectData = [
    { num: 'P-001', name: '新宿オフィスビル改修工事', addr: '東京都新宿区西新宿2-8-1', wt: '改修工事', contract: 45000000, cost: 38000000, start: '2025-01-15', end: '2025-06-30' },
    { num: 'P-002', name: '横浜マンション新築工事', addr: '神奈川県横浜市西区みなとみらい3-1-1', wt: '新築工事', contract: 120000000, cost: 98000000, start: '2024-10-01', end: '2025-09-30' },
    { num: 'P-003', name: '田中邸リノベーション工事', addr: '神奈川県横浜市中区山下町1-1', wt: 'リノベーション', contract: 8500000, cost: 7200000, start: '2024-08-01', end: '2024-11-30' },
    { num: 'P-004', name: '渋谷商業施設内装工事', addr: '東京都渋谷区渋谷2-24-12', wt: '内装工事', contract: 25000000, cost: 21000000, start: '2025-02-01', end: '2025-05-31' },
    { num: 'P-005', name: '川崎工場外壁塗装工事', addr: '神奈川県川崎市川崎区東田町1-1', wt: '塗装工事', contract: 15000000, cost: 12500000, start: '2025-07-01', end: '2025-10-31' },
    { num: 'P-006', name: '豊洲倉庫新築工事', addr: '東京都江東区豊洲3-3-3', wt: '新築工事', contract: 85000000, cost: 70000000, start: '2024-12-01', end: '2025-08-31' },
    { num: 'P-007', name: '池袋商業ビル外装改修', addr: '東京都豊島区南池袋1-1-1', wt: '改修工事', contract: 32000000, cost: 27000000, start: '2025-03-01', end: '2025-07-31' },
    { num: 'P-008', name: '川越住宅地外構工事', addr: '埼玉県川越市脇田町2-2', wt: '外構工事', contract: 5500000, cost: 4500000, start: '2025-08-01', end: '2025-09-30' },
    { num: 'P-009', name: '千葉市役所空調設備更新', addr: '千葉県千葉市中央区千葉港1-1', wt: '設備工事', contract: 18000000, cost: 15000000, start: '2025-06-01', end: '2025-09-30' },
    { num: 'P-010', name: '品川マンション屋根防水工事', addr: '東京都品川区大崎2-2-2', wt: '防水工事', contract: 6200000, cost: 5100000, start: '2025-04-01', end: '2025-05-31' },
    { num: 'P-011', name: '大宮駅前複合施設新築', addr: '埼玉県さいたま市大宮区宮町2-2', wt: '新築工事', contract: 250000000, cost: 210000000, start: '2025-01-01', end: '2026-03-31' },
    { num: 'P-012', name: '町田戸建住宅新築工事', addr: '東京都町田市原町田1-1-1', wt: '新築工事', contract: 28000000, cost: 23000000, start: '2025-05-01', end: '2025-11-30' },
    { num: 'P-013', name: '横浜工場床塗装工事', addr: '神奈川県横浜市鶴見区鶴見中央1-1', wt: '塗装工事', contract: 4800000, cost: 3900000, start: '2025-09-01', end: '2025-09-30' },
    { num: 'P-014', name: '川口マンションリノベーション', addr: '埼玉県川口市本町1-1-1', wt: 'リノベーション', contract: 12000000, cost: 9800000, start: '2024-11-01', end: '2025-02-28' },
    { num: 'P-015', name: '調布市民センター改修工事', addr: '東京都調布市小島町1-1-1', wt: '改修工事', contract: 38000000, cost: 32000000, start: '2024-09-01', end: '2025-01-31' },
    { num: 'P-016', name: '浦和オフィス電気設備工事', addr: '埼玉県さいたま市浦和区常盤1-1-1', wt: '電気工事', contract: 9500000, cost: 7800000, start: '2025-10-01', end: '2025-11-30' },
    { num: 'P-017', name: '千葉ニュータウン住宅造成', addr: '千葉県印西市大森1-1-1', wt: '土木工事', contract: 75000000, cost: 62000000, start: '2025-04-01', end: '2025-12-31' },
    { num: 'P-018', name: '吉祥寺カフェ内装工事', addr: '東京都武蔵野市吉祥寺本町1-1-1', wt: '内装工事', contract: 7200000, cost: 5900000, start: '2025-11-01', end: '2025-12-31' },
    { num: 'P-019', name: '立川ビルエントランス改装', addr: '東京都立川市柴崎町1-1-1', wt: '改修工事', contract: 3800000, cost: 3100000, start: '2025-12-01', end: '2026-01-31' },
    { num: 'P-020', name: '府中工場解体工事', addr: '東京都府中市宮西町1-1-1', wt: '解体工事', contract: 22000000, cost: 18500000, start: '2025-02-15', end: '2025-04-30' },
  ]

  const supervisors = [supervisor1, supervisor2, admin]
  const salesUsers = [sales, admin, office]

  const projects = await Promise.all(
    projectData.map((d, i) =>
      prisma.project.create({
        data: {
          projectNumber: d.num,
          name: d.name,
          status: statusList[i],
          customerId: customers[i].id,
          address: d.addr,
          workType: d.wt,
          managerId: supervisors[i % supervisors.length].id,
          salesId: salesUsers[i % salesUsers.length].id,
          contractAmount: d.contract,
          estimatedCost: d.cost,
          startDate: new Date(d.start),
          endDate: new Date(d.end),
          deliveryDate: new Date(d.end),
          notes: `【サンプル】${d.name}の工事概要メモです。`,
          companyId: company.id,
        },
      })
    )
  )
  console.log('Projects created:', projects.length)

  // ── 工程 各案件4件 = 80件（最初の5案件で20件表示） ──────
  const scheduleItems = ['仮設工事', '基礎工事', '躯体工事', '内装工事', '外装工事', '設備工事', '解体工事', '塗装工事', '仕上げ工事', '検査・引渡し']
  const scheduleStatuses = ['完了', '進行中', '未着手', '未着手']
  const scheduleProgresses = [100, 60, 0, 0]
  const allSchedules: any[] = []
  for (let pi = 0; pi < projects.length; pi++) {
    const p = projects[pi]
    const base = new Date(projectData[pi].start)
    for (let si = 0; si < 4; si++) {
      const startOffset = si * 30
      const sd = new Date(base); sd.setDate(sd.getDate() + startOffset)
      const ed = new Date(sd); ed.setDate(ed.getDate() + 28)
      allSchedules.push({
        projectId: p.id,
        name: `【サンプル】${scheduleItems[(pi + si) % scheduleItems.length]}`,
        startDate: sd,
        endDate: ed,
        assigneeId: supervisors[pi % supervisors.length].id,
        progress: scheduleProgresses[si],
        status: scheduleStatuses[si],
        category: scheduleItems[(pi + si) % scheduleItems.length],
      })
    }
  }
  await prisma.schedule.createMany({ data: allSchedules })
  console.log('Schedules created:', allSchedules.length)

  // ── 写真 20件 ─────────────────────────────────────────
  const photoTypes = ['着工前', '工事中', '完了', '検査', '資材']
  const photoLocations = ['1階', '2階', '屋上', '基礎', '外壁', '内装', '設備室', 'エントランス']
  const photoData = Array.from({ length: 20 }, (_, i) => ({
    projectId: projects[i % projects.length].id,
    uploaderId: supervisors[i % supervisors.length].id,
    filePath: `/uploads/photos/sample_${String(i + 1).padStart(3, '0')}.jpg`,
    comment: `【サンプル】${photoLocations[i % photoLocations.length]}の${photoTypes[i % photoTypes.length]}写真です。`,
    tags: `サンプル,${photoTypes[i % photoTypes.length]},${photoLocations[i % photoLocations.length]}`,
    location: photoLocations[i % photoLocations.length],
    shootingType: photoTypes[i % photoTypes.length],
    category: '一般',
  }))
  await prisma.photo.createMany({ data: photoData })
  console.log('Photos created:', photoData.length)

  // ── チャットルーム＋メッセージ 20件 ──────────────────
  const chatRooms = await Promise.all(
    projects.slice(0, 5).map(p =>
      prisma.chatRoom.create({ data: { projectId: p.id, name: '全体連絡' } })
    )
  )
  const chatSenders = [supervisor1, supervisor2, admin, office, sales, worker]
  const chatTexts = [
    '本日の作業完了しました。明日は内装工事を予定しています。',
    '資材の納品が確認できました。搬入ルートの確認をお願いします。',
    '安全パトロールを実施しました。特に問題ありません。',
    '検査の日程について確認させてください。来週の火曜はいかがでしょうか。',
    '進捗写真をアップしました。ご確認ください。',
    '足場の設置が完了しました。明日から外壁工事に入ります。',
    '電気配線の確認が取れました。設備工事を進めます。',
    '気温が高いため、熱中症対策を徹底しています。',
    '近隣からの問い合わせがありました。対応済みです。',
    '型枠の解体が完了しました。コンクリートの養生状態は良好です。',
    '本日は雨天のため、外部作業を中止しました。',
    '検査官の立会い検査が合格しました。次工程に進めます。',
    '資材の数量を再確認しました。追加発注が必要です。',
    '安全書類の確認をお願いします。期限が近づいています。',
    '工程の見直しについて打ち合わせが必要です。',
    '下請け業者との調整が完了しました。',
    '写真台帳の作成が完了しました。確認をお願いします。',
    '完了検査の準備を始めます。チェックリストを共有します。',
    '引き渡しの日程が確定しました。来月15日です。',
    '本日の作業員：大工6名、左官2名、電気1名、設備1名の計10名でした。',
  ]
  const chatMessages = chatTexts.map((content, i) => ({
    roomId: chatRooms[i % chatRooms.length].id,
    senderId: chatSenders[i % chatSenders.length].id,
    content: `【サンプル】${content}`,
    createdAt: new Date(Date.now() - (20 - i) * 3600000),
  }))
  await prisma.chatMessage.createMany({ data: chatMessages })
  console.log('Chat messages created:', chatMessages.length)

  // ── 検査 20件 ─────────────────────────────────────────
  const inspectionTypes = ['行政検査', '社内検査', '顧客立会検査', '中間検査', '完了検査', '品質検査']
  const inspectionStatuses = ['未実施', '未実施', '合格', '合格', '実施中', '不合格']
  const inspectionNames = [
    '着工前確認検査', '基礎配筋検査', '中間検査（躯体）', '防水工事検査', '内装仕上げ検査',
    '設備機器検査', '外壁検査', '完了検査', '施主立会検査', '社内品質チェック',
    '耐火構造確認', '換気設備検査', '電気設備検査', '給排水設備検査', '断熱材施工検査',
    '防火区画確認', 'バリアフリー確認', '外構工事検査', '屋根防水検査', '引渡し前最終検査',
  ]
  const inspections: any[] = []
  for (let i = 0; i < 20; i++) {
    const baseDate = new Date('2025-01-01')
    baseDate.setDate(baseDate.getDate() + i * 10)
    const insp = await prisma.inspection.create({
      data: {
        projectId: projects[i % projects.length].id,
        name: `【サンプル】${inspectionNames[i]}`,
        type: inspectionTypes[i % inspectionTypes.length],
        scheduledDate: baseDate,
        actualDate: i % 3 !== 0 ? baseDate : null,
        inspectorId: supervisors[i % supervisors.length].id,
        status: inspectionStatuses[i % inspectionStatuses.length],
        notes: `【サンプル】${inspectionNames[i]}の検査メモです。`,
      },
    })
    inspections.push(insp)
    await prisma.inspectionItem.createMany({
      data: [
        { inspectionId: insp.id, name: '施工精度の確認', result: i % 4 === 3 ? '不合格' : '合格', comment: '基準値内を確認' },
        { inspectionId: insp.id, name: '材料品質の確認', result: '合格', comment: '規格品を使用' },
        { inspectionId: insp.id, name: '安全対策の確認', result: i % 5 === 0 ? '指摘' : '合格', comment: i % 5 === 0 ? '手摺の取り付け要確認' : '適切に実施' },
      ],
    })
  }
  console.log('Inspections created:', inspections.length)

  // ── 是正事項 20件 ─────────────────────────────────────
  const defectContents = [
    'クロスの浮きが発生している', '床材に傷がある', 'コンクリートにジャンカが発生',
    'タイルの目地が不均一', '窓枠の隙間が大きい', '塗装の剥がれが発生',
    '排水勾配が不足', '電気配線の露出', '断熱材の施工不良', '防水シートの破れ',
    '建具の建て付けが悪い', 'コーキングの打ち忘れ', 'ボルトの締め付け不足',
    'ガラスに傷がある', '外壁タイルのひび割れ', '給水管の水漏れ',
    '換気扇の取り付け位置ずれ', '階段の手摺が固定不良', '屋根材の浮き上がり', '基礎の型枠跡',
  ]
  const defectLocations = ['1階廊下', '2階トイレ', 'B1F柱', '屋上', '外壁', 'エントランス', '3階会議室', '機械室', '駐車場', '階段']
  const defectStatuses = ['未対応', '対応中', '確認待ち', '対応済', '未対応']
  const defectData = defectContents.map((content, i) => ({
    projectId: projects[i % projects.length].id,
    inspectionId: i < 10 ? inspections[i].id : null,
    content: `【サンプル】${content}`,
    location: defectLocations[i % defectLocations.length],
    assigneeId: supervisors[i % supervisors.length].id,
    dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 3600000),
    status: defectStatuses[i % defectStatuses.length],
  }))
  await prisma.defect.createMany({ data: defectData })
  console.log('Defects created:', defectData.length)

  // ── 発注 20件 ─────────────────────────────────────────
  const orderSubjects = [
    '内装材料一式（石膏ボード・クロス）', '鉄筋材料（D13・D16・D22）', '床材・磁器タイル一式',
    '電気配線工事材料', '給排水設備部材', '外壁塗料一式', '断熱材（グラスウール）',
    '建具・サッシ一式', '防水シート・シーリング材', '仮設材料（足場・養生）',
    '照明器具一式', '空調設備部材', '屋根材（ガルバリウム鋼板）', '外構ブロック・コンクリート',
    'キッチン・衛生設備一式', '窓ガラス一式', '外壁サイディング材', '木材・合板一式',
    '塗装工事材料（下地材・仕上材）', '解体廃材処分費',
  ]
  const orderStatuses = ['発注済', '承認済', '納品済', '下書き', '承認依頼中', '発注済', '完了', '承認済', '発注済', '納品済', '下書き', '承認依頼中', '発注済', '完了', '承認済', '発注済', '納品済', '下書き', '発注済', '完了']
  const workTypeList = ['内装工事', '躯体工事', '内装工事', '電気工事', '設備工事', '塗装工事', '断熱工事', '建具工事', '防水工事', '仮設工事', '電気工事', '設備工事', '屋根工事', '外構工事', '衛生工事', '建具工事', '外装工事', '木工事', '塗装工事', '解体工事']
  const amounts = [3500000, 8000000, 1200000, 2400000, 3200000, 980000, 450000, 5600000, 380000, 1800000, 720000, 4200000, 1100000, 680000, 8500000, 920000, 2100000, 1350000, 560000, 2800000]

  const orderData = orderSubjects.map((subject, i) => {
    const amt = amounts[i]
    const tax = Math.floor(amt * 0.1)
    return {
      projectId: projects[i % projects.length].id,
      supplierId: suppliers[i % suppliers.length].id,
      orderNumber: `ORD-${String(i + 1).padStart(3, '0')}`,
      subject: `【サンプル】${subject}`,
      workType: workTypeList[i],
      orderDate: new Date(Date.now() - (20 - i) * 5 * 24 * 3600000),
      deliveryDate: new Date(Date.now() + (i + 1) * 7 * 24 * 3600000),
      paymentTerms: '月末締め翌月末払い',
      amount: amt,
      taxAmount: tax,
      totalAmount: amt + tax,
      status: orderStatuses[i],
      notes: `【サンプル】${subject}の発注メモ。`,
      companyId: company.id,
    }
  })
  const createdOrders = await Promise.all(orderData.map(d => prisma.order.create({ data: d })))
  console.log('Orders created:', createdOrders.length)

  // ── 請求 20件 ─────────────────────────────────────────
  const invoiceStatuses = ['入金済', '送付済', '承認済', '未作成', '作成済', '入金待ち', '入金済', '送付済', '承認済', '未作成', '入金済', '入金済', '送付済', '承認済', '未作成', '入金済', '入金待ち', '作成済', '送付済', '入金済']
  const invoiceAmounts = [8500000, 15000000, 25000000, 45000000, 3500000, 12000000, 22000000, 6200000, 85000000, 32000000, 18000000, 4800000, 28000000, 9500000, 75000000, 7200000, 3800000, 38000000, 22000000, 250000000]
  const invoiceData = invoiceAmounts.map((amt, i) => {
    const tax = Math.floor(amt * 0.1)
    const baseDate = new Date('2024-10-01')
    baseDate.setMonth(baseDate.getMonth() + Math.floor(i / 2))
    const dueDate = new Date(baseDate); dueDate.setMonth(dueDate.getMonth() + 1)
    return {
      projectId: projects[i % projects.length].id,
      customerId: customers[i % customers.length].id,
      invoiceNumber: `INV-${String(i + 1).padStart(3, '0')}`,
      invoiceDate: baseDate,
      dueDate,
      paidDate: invoiceStatuses[i] === '入金済' ? new Date(dueDate.getTime() - 5 * 24 * 3600000) : null,
      amount: amt,
      taxAmount: tax,
      totalAmount: amt + tax,
      status: invoiceStatuses[i],
      notes: `【サンプル】${projects[i % projects.length].name}の請求書です。`,
      companyId: company.id,
    }
  })
  const createdInvoices = await Promise.all(invoiceData.map(d => prisma.invoice.create({ data: d })))
  console.log('Invoices created:', createdInvoices.length)

  // ── 実行予算 20件（最初の5案件に各4件） ─────────────
  const budgetCategories = ['仮設工事費', '基礎工事費', '躯体工事費', '内装工事費', '外装工事費', '設備工事費', '電気工事費', '諸経費', '解体工事費', '外構工事費']
  const budgetData: any[] = []
  for (let i = 0; i < 20; i++) {
    const pIdx = Math.floor(i / 4) % projects.length
    const baseAmt = (projects[pIdx].estimatedCost ?? 10000000) / 5
    budgetData.push({
      projectId: projects[pIdx].id,
      category: `【サンプル】${budgetCategories[i % budgetCategories.length]}`,
      description: `${budgetCategories[i % budgetCategories.length]}の計画予算`,
      amount: Math.floor(baseAmt * (0.5 + Math.random() * 0.5)),
      companyId: company.id,
    })
  }
  await prisma.budget.createMany({ data: budgetData })
  console.log('Budgets created:', budgetData.length)

  // ── 日報 20件 ─────────────────────────────────────────
  const weathers = ['晴れ', '曇り', '雨', '晴れ時々曇り', '曇り時々晴れ']
  const dailyContents = [
    '躯体工事を実施。コンクリート打設完了。', '型枠解体作業を実施。', '配筋検査を実施、合格。',
    '内装下地ボード張り施工。', 'クロス貼り作業開始。', '電気配線工事完了。',
    '給排水設備取付作業。', '外壁塗装の下地処理。', '外壁仕上げ塗装実施。',
    '屋根防水工事完了。', '建具取付作業。', 'タイル工事仕上げ。',
    '足場解体完了。', '清掃・養生撤去作業。', '設備機器試運転。',
    '最終仕上げ確認作業。', '引き渡し前清掃。', '各種書類整理作業。',
    '完了検査の立会い。', '引き渡し式を実施。',
  ]
  const dailyReportData = dailyContents.map((content, i) => {
    const d = new Date('2025-01-06')
    d.setDate(d.getDate() + i)
    return {
      projectId: projects[i % projects.length].id,
      reporterId: supervisors[i % supervisors.length].id,
      workDate: d,
      weather: weathers[i % weathers.length],
      content: `【サンプル】${content}`,
      workers: 5 + (i % 10),
      progress: i % 5 === 4 ? '予定より遅れ' : '予定通り',
      issues: i % 4 === 0 ? `【サンプル】資材の搬入が${i + 1}時間遅延した。` : 'なし',
      nextPlan: `【サンプル】${dailyContents[(i + 1) % dailyContents.length]}`,
    }
  })
  await prisma.dailyReport.createMany({ data: dailyReportData })
  console.log('Daily reports created:', dailyReportData.length)

  // ── 現場日誌 20件 ─────────────────────────────────────
  const siteDiaryData = Array.from({ length: 20 }, (_, i) => {
    const d = new Date('2025-01-06')
    d.setDate(d.getDate() + i)
    return {
      projectId: projects[i % projects.length].id,
      date: d,
      weather: weathers[i % weathers.length],
      temperature: 10 + i % 20,
      workers: 4 + (i % 12),
      workContent: `【サンプル】${dailyContents[i]}`,
      issues: i % 3 === 0 ? `【サンプル】課題事項${i + 1}：近隣からの苦情対応。` : null,
      tomorrowPlan: `【サンプル】${dailyContents[(i + 1) % dailyContents.length]}`,
      authorId: supervisors[i % supervisors.length].id,
      companyId: company.id,
    }
  })
  await prisma.siteDiary.createMany({ data: siteDiaryData })
  console.log('Site diaries created:', siteDiaryData.length)

  // ── KY活動 20件 ──────────────────────────────────────
  const kyRisks = [
    '高所作業による墜落転落', '重機による挟まれ・巻き込まれ', '資材の転倒・落下',
    '電気感電事故', '熱中症', '粉じん吸入', '開口部への転落',
    '足場からの落下', '工具による切り傷', '化学物質による中毒',
  ]
  const kyData = Array.from({ length: 20 }, (_, i) => {
    const d = new Date('2025-01-06')
    d.setDate(d.getDate() + i)
    return {
      projectId: projects[i % projects.length].id,
      activityDate: d,
      leader: supervisors[i % supervisors.length].name,
      participants: `田中・鈴木・伊藤・山本・${5 + i % 5}名`,
      risks: `【サンプル】${kyRisks[i % kyRisks.length]}に対する対策：安全帯使用、作業前確認、声掛け徹底。`,
      location: `${projects[i % projects.length].address}（${['1階', '2階', '屋上', '外壁', '地下'][i % 5]}）`,
      notes: `【サンプル】本日のKY活動記録。全員参加で安全意識を確認した。`,
      companyId: company.id,
    }
  })
  await prisma.kyActivity.createMany({ data: kyData })
  console.log('KY activities created:', kyData.length)

  // ── ヒヤリハット 20件 ────────────────────────────────
  const situations = [
    '足場上で作業中にバランスを崩しそうになった', '重機の旋回時に作業員に接触しそうになった',
    '資材搬入時に荷崩れが発生した', '電動工具の誤作動が発生した', '開口部に誤って近づいた',
    '高所作業中に工具を落としそうになった', '解体中に予期せぬ亀裂が発生した',
    '配線作業中に感電の危険があった', '強風で仮囲いが倒れそうになった',
    '転倒・滑落しそうになった', '作業中に頭部を打ちそうになった',
    '薬品使用時に飛散があった', '機械の誤操作で作業員が危険な状態になった',
    'クレーン作業中に荷物が揺れた', '搬入路で車両と歩行者が接触しそうになった',
    '火気使用作業で火花が飛散した', '粉じんで視界が悪化した',
    '仮設電源の漏電警報が鳴った', '掘削中に土砂崩れの兆候があった',
    '水漏れで床が滑りやすくなった',
  ]
  const severities = ['低', '中', '高', '低', '中']
  const nearMissData = situations.map((situation, i) => {
    const d = new Date('2025-01-06')
    d.setDate(d.getDate() + i)
    return {
      projectId: projects[i % projects.length].id,
      reporterId: supervisors[i % supervisors.length].id,
      occurredAt: d,
      location: `${['1階', '2階', '屋上', '地下', '外部'][i % 5]}`,
      situation: `【サンプル】${situation}`,
      cause: `【サンプル】原因：${['確認不足', '連絡不足', '環境不良', '技量不足', '疲労'][i % 5]}`,
      countermeasure: `【サンプル】対策：作業手順の見直しと再教育を実施した。`,
      severity: severities[i % severities.length],
      status: i % 3 === 0 ? '対策完了' : '報告済',
      companyId: company.id,
    }
  })
  await prisma.nearMiss.createMany({ data: nearMissData })
  console.log('Near misses created:', nearMissData.length)

  // ── 安全パトロール 20件 ───────────────────────────────
  const patrolResults = ['良好', '良好', '要改善', '良好', '不適合']
  const checkItemSets = [
    [{ item: '保護具の着用', result: '良好', comment: '全員着用確認' }, { item: '足場の状態', result: '良好', comment: '固定良好' }, { item: '整理整頓', result: '要改善', comment: '資材散乱あり要片付け' }],
    [{ item: '安全帯の使用', result: '良好', comment: '高所作業で全員使用' }, { item: '開口部養生', result: '良好', comment: '蓋及び手摺あり' }, { item: '消火器配置', result: '良好', comment: '規定位置に設置' }],
  ]
  const patrolData = Array.from({ length: 20 }, (_, i) => {
    const d = new Date('2025-01-06')
    d.setDate(d.getDate() + i * 3)
    return {
      projectId: projects[i % projects.length].id,
      patrolDate: d,
      patrolledBy: supervisors[i % supervisors.length].id,
      checkItems: JSON.stringify(checkItemSets[i % checkItemSets.length]),
      overallResult: patrolResults[i % patrolResults.length],
      correctionRequired: i % 5 === 2,
      notes: `【サンプル】安全パトロール実施記録。${i % 5 === 2 ? '是正指示を出した。' : '問題なし。'}`,
      companyId: company.id,
    }
  })
  await prisma.safetyPatrol.createMany({ data: patrolData })
  console.log('Safety patrols created:', patrolData.length)

  // ── 入退場記録 20件 ───────────────────────────────────
  const workerNames = ['大工 一郎', '鉄筋工 次郎', '左官工 三郎', '電気工 四郎', '設備工 五郎', '塗装工 六郎', '解体工 七郎', '足場工 八郎', '内装工 九郎', '外構工 十郎']
  const attendanceData = Array.from({ length: 20 }, (_, i) => {
    const d = new Date('2025-01-06')
    d.setDate(d.getDate() + Math.floor(i / 2))
    return {
      projectId: projects[i % projects.length].id,
      workerName: `【サンプル】${workerNames[i % workerNames.length]}`,
      company: suppliers[i % suppliers.length].name,
      workDate: d,
      entryTime: '08:00',
      exitTime: i % 5 === 0 ? '19:30' : '17:30',
      workContent: `【サンプル】${dailyContents[i % dailyContents.length]}`,
      workingHours: i % 5 === 0 ? 11 : 9,
      overtimeHours: i % 5 === 0 ? 2 : 0,
      checkInMethod: ['QR', 'manual', 'QR', 'face', 'manual'][i % 5],
      companyId: company.id,
    }
  })
  await prisma.workerAttendance.createMany({ data: attendanceData })
  console.log('Attendance records created:', attendanceData.length)

  // ── 見積 20件 ─────────────────────────────────────────
  const estimateStatuses = ['作成中', '提出済', '承認済', '却下', '作成中', '提出済', '承認済', '提出済', '作成中', '承認済', '提出済', '作成中', '承認済', '却下', '提出済', '承認済', '作成中', '提出済', '承認済', '作成中']
  const estimateAmounts = [4500000, 12000000, 2500000, 8500000, 15000000, 3200000, 6800000, 22000000, 950000, 38000000, 1800000, 5500000, 9200000, 28000000, 4200000, 11000000, 7500000, 18500000, 3600000, 85000000]
  const estimateData = estimateAmounts.map((amt, i) => {
    const tax = Math.floor(amt * 0.1)
    const d = new Date('2024-10-01')
    d.setDate(d.getDate() + i * 7)
    const valid = new Date(d); valid.setMonth(valid.getMonth() + 1)
    return {
      projectId: projects[i % projects.length].id,
      estimateNumber: `EST-${String(i + 1).padStart(3, '0')}`,
      estimateDate: d,
      validUntil: valid,
      amount: amt,
      taxAmount: tax,
      totalAmount: amt + tax,
      status: estimateStatuses[i],
      notes: `【サンプル】${projects[i % projects.length].name}の見積書です。`,
      companyId: company.id,
    }
  })
  await Promise.all(estimateData.map(d => prisma.estimate.create({ data: d })))
  console.log('Estimates created:', estimateData.length)

  // ── 図面 20件 ─────────────────────────────────────────
  const drawingTypes = ['平面図', '立面図', '断面図', '配置図', '設備図', '電気図', '詳細図', '構造図']
  const drawingData = Array.from({ length: 20 }, (_, i) => ({
    projectId: projects[i % projects.length].id,
    uploaderId: supervisors[i % supervisors.length].id,
    name: `【サンプル】${drawingTypes[i % drawingTypes.length]}_Rev.${Math.floor(i / 8) + 1}`,
    drawingType: drawingTypes[i % drawingTypes.length],
    drawingNumber: `DWG-${String(i + 1).padStart(3, '0')}`,
    version: Math.floor(i / 8) + 1,
    isLatest: true,
    filePath: `/uploads/drawings/sample_${String(i + 1).padStart(3, '0')}.pdf`,
    description: `【サンプル】${drawingTypes[i % drawingTypes.length]}のサンプル図面です。`,
  }))
  await prisma.drawing.createMany({ data: drawingData })
  console.log('Drawings created:', drawingData.length)

  // ── 引合・商談 20件 ──────────────────────────────────
  const leadStatuses = ['新規問い合わせ', '初回対応', '現地調査', '見積作成中', '見積提出済', '契約交渉', '契約', '失注', '新規問い合わせ', '初回対応', '現地調査', '見積作成中', '見積提出済', '契約', '失注', '新規問い合わせ', '初回対応', '見積作成中', '契約交渉', '契約']
  const leadTitles = [
    '○○ビルの外壁改修工事', '新築住宅（木造2階建）', 'マンション室内リノベ',
    '工場の塗装工事', '商業施設の内装工事', '駐車場の外構整備',
    '事務所の電気工事', '給排水設備更新', 'クリニック新築工事',
    '倉庫の屋根修繕', 'オフィスビルの空調更新', '戸建住宅の屋根葺き替え',
    '飲食店の内装リノベ', '工場の床塗装', '集合住宅の外壁修繕',
    '保育園の増築工事', 'コンビニの改装工事', '学校のトイレ改修',
    'ホテルの客室リノベ', 'スポーツ施設の外構工事',
  ]
  const leadData = leadTitles.map((title, i) => {
    const d = new Date('2024-10-01')
    d.setDate(d.getDate() + i * 5)
    return {
      title: `【サンプル】${title}`,
      customerName: customers[i % customers.length].name,
      customerId: customers[i % customers.length].id,
      status: leadStatuses[i],
      source: ['ホームページ', '紹介', '展示会', '電話問い合わせ', 'DM'][i % 5],
      estimatedAmount: [500000, 2800000, 1200000, 980000, 5500000][i % 5],
      assigneeId: salesUsers[i % salesUsers.length].id,
      contactDate: d,
      nextActionDate: new Date(d.getTime() + 7 * 24 * 3600000),
      notes: `【サンプル】${title}の商談メモです。`,
      companyId: company.id,
    }
  })
  await Promise.all(leadData.map(d => prisma.lead.create({ data: d })))
  console.log('Leads created:', leadData.length)

  // ── 経費 20件 ─────────────────────────────────────────
  const expenseCategories = ['交通費', '宿泊費', '接待費', '消耗品費', '通信費', '工具費', '材料費（少額）', '駐車場代']
  const expenseDescs = [
    '現場往復の交通費', '遠方現場の宿泊費', '顧客接待費', '現場用消耗品購入',
    '携帯電話利用料', '工具の購入費', '少額材料の購入', '現場周辺駐車場代',
    '電車移動費（月次）', '取引先への手土産', 'コピー用紙・文具', '現場監督の出張費',
    '安全用品購入費', 'PC周辺機器費', '図面出力費', '会議費（社内）',
    '測量機器レンタル', '写真現像費', '書類郵送費', '研修受講費',
  ]
  const expenseAmounts = [2800, 12000, 35000, 8500, 3200, 48000, 5600, 4000, 15000, 3500, 2100, 25000, 18000, 32000, 1800, 5000, 65000, 2400, 1200, 42000]
  const expenseStatuses = ['承認済', '申請中', '却下', '承認済', '申請中', '承認済', '申請中', '承認済', '申請中', '承認済', '申請中', '承認済', '申請中', '承認済', '申請中', '承認済', '申請中', '承認済', '申請中', '承認済']
  const expenseData = expenseDescs.map((desc, i) => {
    const d = new Date('2025-01-06')
    d.setDate(d.getDate() + i)
    return {
      projectId: projects[i % projects.length].id,
      category: expenseCategories[i % expenseCategories.length],
      description: `【サンプル】${desc}`,
      amount: expenseAmounts[i],
      expenseDate: d,
      status: expenseStatuses[i],
      submittedBy: supervisors[i % supervisors.length].id,
      approvedBy: expenseStatuses[i] === '承認済' ? admin.id : null,
      approvedAt: expenseStatuses[i] === '承認済' ? new Date(d.getTime() + 24 * 3600000) : null,
      companyId: company.id,
    }
  })
  await Promise.all(expenseData.map(d => prisma.expense.create({ data: d })))
  console.log('Expenses created:', expenseData.length)

  // ── 契約 20件 ─────────────────────────────────────────
  const contractTypes = ['工事請負契約', '設計監理契約', '業務委託契約', '売買契約']
  const contractStatuses = ['締結済', '作成中', '確認中', '締結済', '締結済', '作成中', '確認中', '締結済', '締結済', '作成中', '締結済', '確認中', '締結済', '作成中', '締結済', '締結済', '確認中', '作成中', '締結済', '締結済']
  const contractData = Array.from({ length: 20 }, (_, i) => {
    const d = new Date(projectData[i % projectData.length].start)
    d.setDate(d.getDate() - 14)
    const end = new Date(projectData[i % projectData.length].end)
    return {
      projectId: projects[i % projects.length].id,
      customerId: customers[i % customers.length].id,
      contractNumber: `CON-${String(i + 1).padStart(3, '0')}`,
      title: `【サンプル】${projects[i % projects.length].name} 工事請負契約`,
      contractType: contractTypes[i % contractTypes.length],
      amount: projects[i % projects.length].contractAmount,
      startDate: d,
      endDate: end,
      signedAt: contractStatuses[i] === '締結済' ? d : null,
      status: contractStatuses[i],
      companyId: company.id,
    }
  })
  await Promise.all(contractData.map(d => prisma.contract.create({ data: d })))
  console.log('Contracts created:', contractData.length)

  // ── 入札 20件 ─────────────────────────────────────────
  const bidStatuses = ['準備中', '提出済', '落札', '失注', '準備中', '提出済', '落札', '失注', '準備中', '提出済', '落札', '提出済', '準備中', '落札', '失注', '準備中', '提出済', '落札', '失注', '提出済']
  const bidTitles = [
    '○○市公共施設改修工事', '△△区道路舗装工事', '□□町庁舎新築工事',
    '市営住宅外壁改修', '公民館トイレ改修', '小学校体育館改修',
    '図書館空調更新工事', '公園外構整備工事', '消防署新築工事',
    '病院増築工事', '警察署改修工事', 'スポーツセンター改修',
    '市道橋梁補修工事', '上下水道設備更新', '電気設備更新工事',
    '地域医療センター新築', '福祉センター改修', '文化ホール改修',
    '幹線道路整備工事', '公共駐車場整備工事',
  ]
  const bidData = bidTitles.map((title, i) => {
    const d = new Date('2025-01-15')
    d.setDate(d.getDate() + i * 7)
    const deadline = new Date(d); deadline.setDate(deadline.getDate() + 14)
    const estimated = [5000000, 12000000, 85000000, 8500000, 2200000, 15000000, 9800000, 3200000, 120000000, 250000000, 38000000, 25000000, 18000000, 45000000, 12000000, 180000000, 22000000, 65000000, 95000000, 28000000][i]
    return {
      projectId: null,
      title: `【サンプル】${title}`,
      bidDate: d,
      submissionDeadline: deadline,
      estimatedAmount: estimated,
      bidAmount: bidStatuses[i] !== '準備中' ? Math.floor(estimated * 0.92) : null,
      status: bidStatuses[i],
      result: bidStatuses[i] === '落札' ? '落札' : bidStatuses[i] === '失注' ? '次点' : null,
      competitors: 3 + (i % 5),
      notes: `【サンプル】${title}の入札情報です。`,
      companyId: company.id,
    }
  })
  await Promise.all(bidData.map(d => prisma.bid.create({ data: d })))
  console.log('Bids created:', bidData.length)

  // ── お知らせ 20件 ─────────────────────────────────────
  const announcementData = [
    { title: '【サンプル】年末年始の休業について', content: '12月28日〜1月4日を休業とします。緊急の場合は携帯へご連絡ください。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】安全大会の開催について', content: '毎月1日に全社安全大会を開催します。全員参加をお願いします。', category: '安全', status: '公開' },
    { title: '【サンプル】新しい発注システムの操作方法', content: '新システムへの移行に伴い、操作マニュアルを配布します。', category: 'システム', status: '公開' },
    { title: '【サンプル】健康診断のご案内', content: '年1回の健康診断を実施します。日程は別途通知します。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】台風対策について', content: '台風接近時の現場対応マニュアルを確認してください。', category: '安全', status: '公開' },
    { title: '【サンプル】資格取得支援制度のご案内', content: '建設業関連資格の受験費用を会社が補助します。対象資格一覧を確認してください。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】現場写真のアップロードルール変更', content: '写真は撮影日当日中にアップロードをお願いします。', category: 'システム', status: '公開' },
    { title: '【サンプル】熱中症対策強化期間のお知らせ', content: '6月〜9月は熱中症対策強化期間です。適切な休憩・水分補給を徹底してください。', category: '安全', status: '公開' },
    { title: '【サンプル】作業員名簿の更新依頼', content: '最新の作業員名簿を月末までに提出してください。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】システムメンテナンスのお知らせ', content: '1月15日 22:00〜翌2:00 システムメンテナンスのため利用不可となります。', category: 'システム', status: '公開' },
    { title: '【サンプル】社内研修のご案内', content: '建設業法改正に伴う社内研修を実施します。参加必須です。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】優良協力業者表彰のご案内', content: '年間優良協力業者の表彰式を12月に実施します。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】危険予知訓練の実施について', content: '毎週月曜朝礼時にKYT（危険予知訓練）を実施します。', category: '安全', status: '公開' },
    { title: '【サンプル】見積書テンプレートの更新', content: '新しい見積書テンプレートをシステムにアップしました。', category: 'システム', status: '公開' },
    { title: '【サンプル】インボイス制度対応のご案内', content: 'インボイス制度への対応状況を確認し、登録番号をご提出ください。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】冬季現場安全管理について', content: '凍結・積雪時の現場安全管理を強化してください。', category: '安全', status: '公開' },
    { title: '【サンプル】採用情報の共有', content: '現場監督・施工管理技士を募集中です。紹介があればご連絡ください。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】工事写真の電子化推進', content: '工事写真は全てデジタルカメラ・スマホで撮影し、当日中にアップロードしてください。', category: 'システム', status: '公開' },
    { title: '【サンプル】消防設備点検のお知らせ', content: '社内各現場事務所の消防設備点検を実施します。', category: 'お知らせ', status: '公開' },
    { title: '【サンプル】下請け協力会社安全教育の実施', content: '新規入場者への安全教育を徹底してください。未受講者は入場禁止です。', category: '安全', status: '公開' },
  ]
  await Promise.all(
    announcementData.map((d, i) =>
      prisma.announcement.create({
        data: {
          ...d,
          publishedAt: new Date(Date.now() - (20 - i) * 24 * 3600000),
          companyId: company.id,
          authorId: admin.id,
        },
      })
    )
  )
  console.log('Announcements created:', announcementData.length)

  // ── 通知 20件 ─────────────────────────────────────────
  const notificationData = [
    { title: '【サンプル】新しい案件が登録されました', content: 'P-020 府中工場解体工事が新規登録されました。', type: 'project', link: '/projects' },
    { title: '【サンプル】工程が変更されました', content: 'P-001 新宿オフィスビル改修工事の工程が変更されました。', type: 'schedule', link: '/schedule' },
    { title: '【サンプル】検査予定が近づいています', content: '3日後に完了検査が予定されています。準備を確認してください。', type: 'inspection', link: '/inspections' },
    { title: '【サンプル】是正事項が登録されました', content: 'P-002に是正事項が3件登録されました。対応をお願いします。', type: 'defect', link: '/defects' },
    { title: '【サンプル】発注の承認依頼', content: 'ORD-005 鉄筋材料の発注承認依頼が届いています。', type: 'order', link: '/orders' },
    { title: '【サンプル】請求書の支払期限が近づいています', content: 'INV-002の支払期限まで5日です。確認をお願いします。', type: 'invoice', link: '/invoices' },
    { title: '【サンプル】写真が追加されました', content: 'P-003に新しい工事写真が5枚追加されました。', type: 'photo', link: '/photos' },
    { title: '【サンプル】図面が更新されました', content: 'P-001の平面図がRev.3に更新されました。最新版をご確認ください。', type: 'drawing', link: '/drawings' },
    { title: '【サンプル】チャットにメッセージが届きました', content: '田中 一郎さんからメッセージが届いています。', type: 'chat', link: '/chat' },
    { title: '【サンプル】日報が提出されました', content: 'P-001の日報が提出されました。ご確認ください。', type: 'report', link: '/reports' },
    { title: '【サンプル】原価超過アラート', content: 'P-002の発注額が実行予算の90%を超えました。', type: 'cost', link: '/costs' },
    { title: '【サンプル】案件ステータスが変更されました', content: 'P-004が「検査中」に変更されました。', type: 'project', link: '/projects' },
    { title: '【サンプル】安全パトロール結果', content: 'P-001の安全パトロールで是正指示が1件出ました。', type: 'safety', link: '/safety/patrols' },
    { title: '【サンプル】ヒヤリハット報告', content: 'P-002でヒヤリハットが報告されました。内容を確認してください。', type: 'safety', link: '/safety/near-misses' },
    { title: '【サンプル】招待メールを送信しました', content: '新しいユーザーへの招待メールを送信しました。', type: 'system', link: '/admin/users' },
    { title: '【サンプル】見積書が承認されました', content: 'EST-003の見積書が承認されました。', type: 'estimate', link: '/estimates' },
    { title: '【サンプル】発注が承認されました', content: 'ORD-008の発注が承認されました。協力会社への通知をお願いします。', type: 'order', link: '/orders' },
    { title: '【サンプル】入金が確認されました', content: 'INV-001の入金が確認されました。', type: 'invoice', link: '/invoices' },
    { title: '【サンプル】KY活動記録が提出されました', content: 'P-003のKY活動記録が提出されました。', type: 'safety', link: '/safety/ky' },
    { title: '【サンプル】工事完了報告', content: 'P-003 田中邸リノベーション工事が完了しました。', type: 'project', link: '/projects' },
  ]
  await prisma.notification.createMany({
    data: notificationData.map((d, i) => ({
      ...d,
      userId: admin.id,
      isRead: i > 9,
      createdAt: new Date(Date.now() - (20 - i) * 2 * 3600000),
    })),
  })
  console.log('Notifications created:', notificationData.length)

  // ── 操作ログ 20件 ─────────────────────────────────────
  const auditActions = [
    { action: 'CREATE', target: '案件', detail: 'P-020 府中工場解体工事を作成' },
    { action: 'UPDATE', target: '案件', detail: 'P-001 ステータスを「施工中」に変更' },
    { action: 'CREATE', target: '発注', detail: 'ORD-020 解体廃材処分費を発注' },
    { action: 'APPROVE', target: '発注', detail: 'ORD-001 内装材料一式を承認' },
    { action: 'CREATE', target: '請求', detail: 'INV-020 請求書を作成' },
    { action: 'UPDATE', target: '工程', detail: 'P-002 躯体工事の進捗を60%に更新' },
    { action: 'CREATE', target: '検査', detail: 'P-004 中間検査を登録' },
    { action: 'DELETE', target: '写真', detail: '不要な重複写真を削除' },
    { action: 'CREATE', target: '是正事項', detail: 'P-001 床材傷を是正事項として登録' },
    { action: 'UPDATE', target: '是正事項', detail: 'P-004 クロス浮きを対応済に変更' },
    { action: 'LOGIN', target: 'システム', detail: '管理者がログイン' },
    { action: 'EXPORT', target: 'CSV', detail: '案件一覧CSVをエクスポート' },
    { action: 'CREATE', target: 'ユーザー', detail: '新規ユーザーを招待' },
    { action: 'UPDATE', target: '会社', detail: '会社情報（銀行口座）を更新' },
    { action: 'CREATE', target: '見積', detail: 'EST-010 見積書を作成' },
    { action: 'APPROVE', target: '見積', detail: 'EST-003 見積書を承認' },
    { action: 'CREATE', target: '図面', detail: 'P-001 平面図Rev.3をアップロード' },
    { action: 'UPDATE', target: '案件', detail: 'P-006 完工日を更新' },
    { action: 'CREATE', target: '日報', detail: 'P-002 作業日報を提出' },
    { action: 'LOGOUT', target: 'システム', detail: '管理者がログアウト' },
  ]
  await prisma.auditLog.createMany({
    data: auditActions.map((d, i) => ({
      ...d,
      userId: admin.id,
      userName: admin.name,
      targetId: `sample-id-${i + 1}`,
      companyId: company.id,
      createdAt: new Date(Date.now() - (20 - i) * 2 * 3600000),
    })),
  })
  console.log('Audit logs created:', auditActions.length)

  console.log('\n✅ シードデータの作成が完了しました！')
  console.log('ログイン情報:')
  console.log('  管理者: admin@buildsync.jp / admin1234')
  console.log('  監督 : tanaka@buildsync.jp / pass1234')
  console.log('  事務 : sato@buildsync.jp / pass1234')
  console.log('  営業 : yamada@buildsync.jp / pass1234')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
