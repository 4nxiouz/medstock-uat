-- โปรเบียร์แยกจากเซ็ตหมูกะทะ
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run (รันซ้ำได้ ไม่สร้างเมนูซ้ำ)
-- 1) เปลี่ยนหมวด "โปรเซ็ต + เบียร์" เป็น "โปรเบียร์" และย้ายไปไว้ท้ายสุด
-- 2) ปิดเมนูเซ็ตรวมเบียร์ 3 รายการเดิม (ซ่อนจากหน้าลูกค้า แต่ประวัติออเดอร์เก่ายังอยู่ครบ)
-- 3) เพิ่มโปรเบียร์อย่างเดียว 2 รายการ  ** แก้ราคาได้ตามต้องการ ก่อนกด Run **

-- ย้าย "โปรเบียร์" ไปไว้ท้ายสุด (ลำดับ: เซ็ตหมูกะทะ → สั่งเพิ่ม → เครื่องดื่ม → โปรเบียร์)
-- ต่อไปจัดลำดับเองได้ที่หน้า เมนู ในหลังร้าน (ปุ่มลูกศรข้างชื่อหมวด)
update public.menu_categories set name = 'โปรเบียร์' where id = 4;
update public.menu_categories c set sort_order = v.ord
from (values (1, 1), (2, 2), (3, 3), (4, 4)) as v(id, ord) where c.id = v.id;

update public.menu_items set is_active = false
where category_id = 4 and kind = 'set';

insert into public.menu_items (category_id, name, description, price, kind, is_available, is_active, sort_order)
select 4, v.name, v.description, v.price, 'drink', true, true, v.sort_order
from (values
  ('โปรเบียร์ 3 ขวด + น้ำแข็ง 1 ถัง', 'ช้างหรือลีโอ ขวดใหญ่ (แจ้งในหมายเหตุ) · ปกติ 330 · ขายเฉพาะผู้มีอายุ 20 ปีขึ้นไป', 299, 1),
  ('โปรเบียร์ 6 ขวด + น้ำแข็ง 2 ถัง', 'ช้างหรือลีโอ ขวดใหญ่ (แจ้งในหมายเหตุ) · ปกติ 660 · ขายเฉพาะผู้มีอายุ 20 ปีขึ้นไป', 579, 2)
) as v(name, description, price, sort_order)
where not exists (select 1 from public.menu_items m where m.name = v.name);
