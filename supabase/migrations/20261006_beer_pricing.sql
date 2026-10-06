-- เบียร์: ขายแค่ ลีโอ กับ สิงห์ · มีราคาต่อขวด · โปรเบียร์มีต้นทุน
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run (รันซ้ำได้)
--
-- ต้นทุนเบียร์ = ราคาลัง ÷ 12   (แก้ราคาลังจริงได้ที่ หลังร้าน → เมนู → วัตถุดิบและราคา)
-- ต้นทุนน้ำแข็ง = ราคากระสอบ ÷ จำนวนถังต่อกระสอบ (ตอนนี้ตั้งไว้ 1 กระสอบ = 4 ถัง, กระสอบละ 32)

-- 1) วัตถุดิบ: เพิ่ม "เบียร์สิงห์ ขวดใหญ่" ซื้อเป็นลัง 12 ขวด  ** ใส่ราคาลังจริงตรง 780 **
insert into public.ingredients (name, unit, purchase_unit, units_per_purchase, price_per_purchase, loss_pct, is_active)
select 'เบียร์สิงห์ ขวดใหญ่', 'ขวด', 'ลัง 12 ขวด', 12, 780, 0, true
where not exists (select 1 from public.ingredients where name = 'เบียร์สิงห์ ขวดใหญ่');

-- เลิกขายช้าง: ปิดวัตถุดิบช้าง (ประวัติเดิมยังอยู่)
update public.ingredients set is_active = false where name = 'เบียร์ช้าง ขวดใหญ่';

-- 2) เมนูเบียร์รายขวด ย้ายมาอยู่หมวด "โปรเบียร์" ด้านบนสุด
--    ลีโอ 85 บาท (เดิม 100)
update public.menu_items
set category_id = 4, price = 85, sort_order = 1, is_active = true,
    description = '620 มล. · ขายเฉพาะผู้มีอายุ 20 ปีขึ้นไป', updated_at = now()
where name = 'เบียร์ลีโอ ขวดใหญ่';

--    ช้าง: ปิดเมนู (ไม่ลบ เพื่อให้ยอดขายเก่ายังถูกต้อง)
update public.menu_items set is_active = false, updated_at = now() where name = 'เบียร์ช้าง ขวดใหญ่';

--    สิงห์ 89 บาท (เมนูใหม่)
insert into public.menu_items (category_id, name, description, price, kind, is_available, is_active, sort_order)
select 4, 'เบียร์สิงห์ ขวดใหญ่', '620 มล. · ขายเฉพาะผู้มีอายุ 20 ปีขึ้นไป', 89, 'drink', true, true, 2
where not exists (select 1 from public.menu_items where name = 'เบียร์สิงห์ ขวดใหญ่');

-- 3) โปรเบียร์: ราคาใหม่ให้ถูกกว่าซื้อแยก
--    3 ขวด + น้ำแข็ง 1 ถัง: ซื้อแยก 285–297 → โปร 269
--    6 ขวด + น้ำแข็ง 2 ถัง: ซื้อแยก 570–594 → โปร 529
update public.menu_items
set price = 269, sort_order = 3, updated_at = now(),
    description = 'ลีโอหรือสิงห์ ขวดใหญ่ (แจ้งในหมายเหตุ) · ซื้อแยก 285–297 · ขายเฉพาะผู้มีอายุ 20 ปีขึ้นไป'
where name = 'โปรเบียร์ 3 ขวด + น้ำแข็ง 1 ถัง';

update public.menu_items
set price = 529, sort_order = 4, updated_at = now(),
    description = 'ลีโอหรือสิงห์ ขวดใหญ่ (แจ้งในหมายเหตุ) · ซื้อแยก 570–594 · ขายเฉพาะผู้มีอายุ 20 ปีขึ้นไป'
where name = 'โปรเบียร์ 6 ขวด + น้ำแข็ง 2 ถัง';

-- 4) สูตร/ต้นทุน
--    เบียร์รายขวด = 1 ขวดของยี่ห้อนั้น
--    โปรเบียร์ คิดต้นทุนด้วยสิงห์ (ยี่ห้อที่แพงกว่า) จะได้ไม่ประเมินกำไรสูงเกินจริง + น้ำแข็งถัง
delete from public.recipes
where menu_item_id in (select id from public.menu_items where name in (
  'เบียร์ลีโอ ขวดใหญ่', 'เบียร์สิงห์ ขวดใหญ่', 'โปรเบียร์ 3 ขวด + น้ำแข็ง 1 ถัง', 'โปรเบียร์ 6 ขวด + น้ำแข็ง 2 ถัง'));

insert into public.recipes (menu_item_id, ingredient_id, qty)
select m.id, i.id, v.qty
from (values
  ('เบียร์ลีโอ ขวดใหญ่', 'เบียร์ลีโอ ขวดใหญ่', 1),
  ('เบียร์สิงห์ ขวดใหญ่', 'เบียร์สิงห์ ขวดใหญ่', 1),
  ('โปรเบียร์ 3 ขวด + น้ำแข็ง 1 ถัง', 'เบียร์สิงห์ ขวดใหญ่', 3),
  ('โปรเบียร์ 3 ขวด + น้ำแข็ง 1 ถัง', 'น้ำแข็งถัง', 1),
  ('โปรเบียร์ 6 ขวด + น้ำแข็ง 2 ถัง', 'เบียร์สิงห์ ขวดใหญ่', 6),
  ('โปรเบียร์ 6 ขวด + น้ำแข็ง 2 ถัง', 'น้ำแข็งถัง', 2)
) as v(item, ing, qty)
join public.menu_items m on m.name = v.item
join public.ingredients i on i.name = v.ing;

-- ตรวจผล: ราคา ต้นทุน กำไรต่อรายการ
select m.name, m.price,
       round(sum(r.qty * i.cost_per_unit), 2) as cost,
       round(m.price - sum(r.qty * i.cost_per_unit), 2) as profit
from public.menu_items m
join public.recipes r on r.menu_item_id = m.id
join public.ingredients i on i.id = r.ingredient_id
where m.category_id = 4 and m.is_active
group by m.id, m.name, m.price, m.sort_order
order by m.sort_order;
