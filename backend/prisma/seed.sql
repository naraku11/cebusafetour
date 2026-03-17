-- ============================================================
-- CebuSafeTour — MySQL Seed Data
-- Import via: Hostinger hPanel → phpMyAdmin → Import
-- Or via SSH:  mysql -u u856082912_cebusafetour -p u856082912_cebusafetourdb < seed.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── USERS ────────────────────────────────────────────────────────────────────

INSERT INTO `users`
  (`id`,`name`,`email`,`password`,`nationality`,`contact_number`,`role`,`status`,`language`,`is_verified`,`emergency_contacts`,`created_at`,`updated_at`)
VALUES

-- Admins
('6142a515-fa95-4bac-adbb-454c7fc3719a','Super Administrator','superadmin@cebusafetour.ph',
 '$2a$12$Seaxtd9IJiutgoMFWik8g.AJoxSYFYMfLoo8XZd7i6799IqzkKrLm',
 'Filipino','+63-32-255-0001','admin_super','active','en',1,'[]',NOW(),NOW()),

('91956fbf-f0bf-41f9-9f40-789fa297c23c','Content Manager','content@cebusafetour.ph',
 '$2a$12$WdV1OdU7AjqIp84hS9UFM.Km45YbAe1GOULj0tG5klJqExTbSh1Eu',
 'Filipino','+63-32-255-0002','admin_content','active','en',1,'[]',NOW(),NOW()),

('d3c659df-5a9f-4d0c-9166-9903fc7fe192','Emergency Officer','emergency@cebusafetour.ph',
 '$2a$12$M40DvTVoEvtrSfjhnx.sTe6LpwEx0MHmhkSjBIYRHhGPmExh1236C',
 'Filipino','+63-32-255-0003','admin_emergency','active','en',1,'[]',NOW(),NOW()),

-- Tourists
('021220dc-0a78-4643-b1f3-ab30d1aa14b0','Kim Jisoo','kim.jisoo@example.com',
 '$2a$12$R/N4oVW5sgDSM6oRu5vF6OqHDijL2xKy3CRy2djzl77CTyeRevxOK',
 'Korean','+82-10-1234-5678','tourist','active','ko',1,
 '[{"name":"Kim Minsu","relationship":"Spouse","phone":"+82-10-9876-5432"}]',NOW(),NOW()),

('9bddf9f2-4c93-49a7-80ef-59365d847ccc','Tanaka Hiroshi','tanaka.hiroshi@example.com',
 '$2a$12$R/N4oVW5sgDSM6oRu5vF6OqHDijL2xKy3CRy2djzl77CTyeRevxOK',
 'Japanese','+81-90-1234-5678','tourist','active','ja',1,
 '[{"name":"Tanaka Yuki","relationship":"Wife","phone":"+81-90-8765-4321"}]',NOW(),NOW()),

('a25a4fc9-e32e-4ace-ba2e-69c6f06df358','Wang Wei','wang.wei@example.com',
 '$2a$12$R/N4oVW5sgDSM6oRu5vF6OqHDijL2xKy3CRy2djzl77CTyeRevxOK',
 'Chinese','+86-138-1234-5678','tourist','active','zh',1,
 '[{"name":"Wang Fang","relationship":"Sister","phone":"+86-138-8765-4321"}]',NOW(),NOW()),

('2b8bd5e7-308b-4079-b6d4-0d036d328c9e','Sarah Johnson','sarah.johnson@example.com',
 '$2a$12$R/N4oVW5sgDSM6oRu5vF6OqHDijL2xKy3CRy2djzl77CTyeRevxOK',
 'American','+1-310-555-0199','tourist','active','en',1,
 '[{"name":"Mark Johnson","relationship":"Husband","phone":"+1-310-555-0188"}]',NOW(),NOW()),

('197d6f07-7894-4850-897d-6dabf45e2ced','Maria Santos','maria.santos@example.com',
 '$2a$12$R/N4oVW5sgDSM6oRu5vF6OqHDijL2xKy3CRy2djzl77CTyeRevxOK',
 'Filipino','+63-917-123-4567','tourist','active','fil',1,
 '[{"name":"Jose Santos","relationship":"Father","phone":"+63-917-765-4321"}]',NOW(),NOW()),

('66490725-272b-4657-93c8-09f580d022bd','Emma Müller','emma.muller@example.com',
 '$2a$12$R/N4oVW5sgDSM6oRu5vF6OqHDijL2xKy3CRy2djzl77CTyeRevxOK',
 'German','+49-151-12345678','tourist','active','en',0,'[]',NOW(),NOW());


-- ─── ATTRACTIONS ──────────────────────────────────────────────────────────────

INSERT INTO `attractions`
  (`id`,`name`,`category`,`description`,`district`,`address`,
   `latitude`,`longitude`,`photos`,`operating_hours`,`entrance_fee`,
   `contact_info`,`safety_status`,`crowd_level`,`accessibility_features`,
   `nearby_facilities`,`average_rating`,`total_reviews`,`total_visits`,
   `total_saves`,`status`,`created_by`,`created_at`,`updated_at`)
VALUES

('4115678e-c6b9-43f9-b44b-9d6c851bf6db','Kawasan Falls','waterfall',
 'One of the most beautiful waterfalls in the Philippines, Kawasan Falls in Badian features stunning turquoise blue waters set amidst lush tropical rainforest. It is a popular destination for canyoneering, swimming, and nature trekking.',
 'Badian','Matutinao, Badian, Cebu',9.81670000,123.38330000,
 '["https://images.unsplash.com/photo-1586348943529-beaae6c28db9?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"6:00 AM - 5:00 PM","tue":"6:00 AM - 5:00 PM","wed":"6:00 AM - 5:00 PM","thu":"6:00 AM - 5:00 PM","fri":"6:00 AM - 5:00 PM","sat":"6:00 AM - 5:00 PM","sun":"6:00 AM - 5:00 PM"}',
 100.00,'{"phone":"+63-32-474-8013","website":""}',
 'safe','high','[]',
 '{"hospitals":[{"name":"Badian District Hospital","phone":"+63-32-474-8000","distance":"5km"}],"police":[{"name":"Badian Police Station","phone":"+63-32-474-8010","distance":"4km"}],"fire":[{"name":"Badian Fire Station","phone":"(032) 474-8012","distance":"4km"}]}',
 4.80,1240,8500,3200,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('7387841d-a508-4169-bb4c-0d21ff883f76','Magellan''s Cross','heritage',
 'Magellan''s Cross is a Christian cross planted by Portuguese and Spanish explorers upon their arrival in Cebu on April 14, 1521. It is housed in a chapel right next to the Basilica Minore del Santo Niño.',
 'Cebu City','Magallanes St, Cebu City',10.29290000,123.90190000,
 '["https://images.unsplash.com/photo-1523413307857-ef24a91f8c3d?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1548611635-a2d5df3a79e3?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"8:00 AM - 6:00 PM","tue":"8:00 AM - 6:00 PM","wed":"8:00 AM - 6:00 PM","thu":"8:00 AM - 6:00 PM","fri":"8:00 AM - 6:00 PM","sat":"8:00 AM - 6:00 PM","sun":"8:00 AM - 6:00 PM"}',
 0.00,'{"phone":"+63-32-255-7400"}',
 'safe','moderate','[]',
 '{"hospitals":[{"name":"Vicente Sotto Memorial Medical Center","phone":"(032) 253-9891","distance":"1.5km"}],"police":[{"name":"Cebu City Police Station 1","phone":"(032) 416-0460","distance":"0.5km"}],"fire":[{"name":"Cebu City Fire Station","phone":"(032) 255-0911","distance":"0.8km"}]}',
 4.60,2100,15000,5000,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('c06a934a-63fe-4e10-9f20-aa56df3d8559','Basilica Minore del Santo Niño','church',
 'The oldest Roman Catholic church in the Philippines, the Basilica Minore del Santo Niño houses the image of the Santo Niño de Cebu, the oldest religious relic in the Philippines given by Ferdinand Magellan in 1521.',
 'Cebu City','Osmena Blvd, Cebu City',10.29280000,123.90180000,
 '["https://images.unsplash.com/photo-1568585219612-af3dc82fb265?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1506905891970-14f4a614edca?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1531259683007-c1196787d4d1?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"7:00 AM - 8:00 PM","tue":"7:00 AM - 8:00 PM","wed":"7:00 AM - 8:00 PM","thu":"7:00 AM - 8:00 PM","fri":"7:00 AM - 8:00 PM","sat":"7:00 AM - 9:00 PM","sun":"6:00 AM - 9:00 PM"}',
 0.00,'{"phone":"+63-32-255-7400","website":"https://santoninobasilica.com"}',
 'safe','high','[]',
 '{"hospitals":[{"name":"Cebu Doctors University Hospital","phone":"(032) 255-5555","distance":"1km"}],"police":[{"name":"Cebu City Police Station 1","phone":"(032) 416-0460","distance":"0.3km"}],"fire":[{"name":"Cebu City Fire Station","phone":"(032) 255-0911","distance":"0.6km"}]}',
 4.90,3400,22000,7800,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('4aee07dc-9fc9-4ddb-8e42-ac0ae088f860','Osmeña Peak','mountain',
 'Osmeña Peak is the highest point in Cebu at 1,013 meters above sea level, located in the town of Dalaguete. It offers a breathtaking 360-degree panoramic view of the surrounding mountains and the sea.',
 'Dalaguete','Mantalungon, Dalaguete, Cebu',9.76470000,123.54690000,
 '["https://images.unsplash.com/photo-1576511779378-f8f5a77e2f41?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"5:00 AM - 5:00 PM","tue":"5:00 AM - 5:00 PM","wed":"5:00 AM - 5:00 PM","thu":"5:00 AM - 5:00 PM","fri":"5:00 AM - 5:00 PM","sat":"5:00 AM - 5:00 PM","sun":"5:00 AM - 5:00 PM"}',
 50.00,'{"phone":"+63-32-484-8001"}',
 'caution','moderate','[]',
 '{"hospitals":[{"name":"Dalaguete Community Hospital","phone":"+63-32-484-8005","distance":"8km"}],"police":[{"name":"Dalaguete Police Station","phone":"+63-32-484-8010","distance":"7km"}],"fire":[]}',
 4.70,980,6200,2900,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('ecdd396b-14c4-4b9d-840c-374eeced83f6','Moalboal Beach','beach',
 'Moalboal is a world-class dive destination on the southwest coast of Cebu, famous for its sardine run — millions of sardines swirling in an underwater tornado. The beach also offers stunning coral reefs and sea turtle sightings.',
 'Moalboal','Panagsama Beach, Moalboal, Cebu',9.94030000,123.39260000,
 '["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1544550581-1bcf2a88c21d?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1559494800-f47b87a6d4d4?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"Open 24 hours","tue":"Open 24 hours","wed":"Open 24 hours","thu":"Open 24 hours","fri":"Open 24 hours","sat":"Open 24 hours","sun":"Open 24 hours"}',
 0.00,'{"phone":"+63-32-474-0001"}',
 'safe','moderate','[]',
 '{"hospitals":[{"name":"Moalboal District Hospital","phone":"+63-32-474-8100","distance":"3km"}],"police":[{"name":"Moalboal Police Station","phone":"+63-32-474-8102","distance":"2km"}],"fire":[{"name":"Moalboal BFP Station","phone":"(032) 474-8103","distance":"2.5km"}]}',
 4.70,1560,9800,4100,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('2c10ffe6-25f7-4444-b9f4-7a4891b060aa','Temple of Leah','heritage',
 'Often called the Taj Mahal of Cebu, the Temple of Leah is a Roman-inspired temple built by Teodorico Adarna for his late wife Leah. Located in Busay Hills, it offers a stunning view of Cebu City.',
 'Busay','Nivel Hills, Busay, Cebu City',10.35750000,123.89580000,
 '["https://images.unsplash.com/photo-1555636222-cae831e670b3?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1569132232985-acd4b53b2b21?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"8:00 AM - 8:00 PM","tue":"8:00 AM - 8:00 PM","wed":"8:00 AM - 8:00 PM","thu":"8:00 AM - 8:00 PM","fri":"8:00 AM - 8:00 PM","sat":"8:00 AM - 9:00 PM","sun":"8:00 AM - 9:00 PM"}',
 50.00,'{"phone":"+63-32-232-5050"}',
 'safe','moderate','[]',
 '{"hospitals":[{"name":"Chong Hua Hospital","phone":"(032) 255-8000","distance":"4km"}],"police":[{"name":"Busay Police Sub-station","phone":"(032) 232-5060","distance":"1km"}],"fire":[]}',
 4.50,1820,11000,4500,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('6370cec0-726f-483e-b725-f78f6cbe0993','Tops Lookout','park',
 'Tops Lookout at Busay Hill offers one of the most spectacular panoramic views of Cebu City and its neighboring islands. Best visited during sunrise and sunset, it is a favorite spot for couples and photography enthusiasts.',
 'Busay','Busay, Cebu City',10.36110000,123.88890000,
 '["https://images.unsplash.com/photo-1527769929518-b5fd0e2a0ff8?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1506905891970-14f4a614edca?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"5:00 AM - 10:00 PM","tue":"5:00 AM - 10:00 PM","wed":"5:00 AM - 10:00 PM","thu":"5:00 AM - 10:00 PM","fri":"5:00 AM - 12:00 AM","sat":"5:00 AM - 12:00 AM","sun":"5:00 AM - 10:00 PM"}',
 100.00,'{"phone":"+63-32-232-6000"}',
 'safe','low','[]',
 '{"hospitals":[{"name":"Chong Hua Hospital","phone":"(032) 255-8000","distance":"5km"}],"police":[{"name":"Busay Police Sub-station","phone":"(032) 232-5060","distance":"0.5km"}],"fire":[]}',
 4.60,760,5400,2100,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('8b8026db-21b4-4d7c-851f-87d09b654250','Fort San Pedro','heritage',
 'Fort San Pedro is the smallest and oldest triangular fort in the Philippines, built by Miguel López de Legazpi in 1565 using the labor of indigenous workers under the supervision of Spanish colonizers.',
 'Cebu City','A. Pigafetta St, Cebu City',10.28970000,123.90410000,
 '["https://images.unsplash.com/photo-1548013641-f79f2b39e1e3?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1534430480872-b59d0b32acea?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"8:00 AM - 7:00 PM","tue":"8:00 AM - 7:00 PM","wed":"8:00 AM - 7:00 PM","thu":"8:00 AM - 7:00 PM","fri":"8:00 AM - 7:00 PM","sat":"8:00 AM - 7:00 PM","sun":"8:00 AM - 7:00 PM"}',
 30.00,'{"phone":"+63-32-255-6467"}',
 'safe','low','[]',
 '{"hospitals":[{"name":"Vicente Sotto Memorial Medical Center","phone":"(032) 253-9891","distance":"1km"}],"police":[{"name":"Port Area Police Station","phone":"(032) 255-7777","distance":"0.3km"}],"fire":[{"name":"Cebu City Fire Station","phone":"(032) 255-0911","distance":"1km"}]}',
 4.40,890,7100,2300,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('94b2fd48-7977-408a-8417-801c946fbe56','Carbon Market','market',
 'Carbon Market is the largest and oldest public market in Cebu City, offering everything from fresh produce, dried fish, flowers, clothes, and handicrafts. It is a vibrant cultural hub and an authentic Cebuano experience.',
 'Cebu City','M.C. Briones St, Cebu City',10.29470000,123.89960000,
 '["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1534040385115-33dcb3f3e8cf?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"4:00 AM - 9:00 PM","tue":"4:00 AM - 9:00 PM","wed":"4:00 AM - 9:00 PM","thu":"4:00 AM - 9:00 PM","fri":"4:00 AM - 9:00 PM","sat":"4:00 AM - 9:00 PM","sun":"4:00 AM - 9:00 PM"}',
 0.00,'{"phone":"+63-32-255-0100"}',
 'caution','high','[]',
 '{"hospitals":[{"name":"Cebu City Medical Center","phone":"(032) 255-1234","distance":"0.5km"}],"police":[{"name":"Carbon Police Sub-station","phone":"(032) 255-9900","distance":"0.2km"}],"fire":[{"name":"Cebu City Fire Station","phone":"(032) 255-0911","distance":"0.5km"}]}',
 3.90,620,18000,1200,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW()),

('0d0562be-1299-4399-b6a4-8ab30b701352','Mactan Shrine','heritage',
 'The Mactan Shrine (Lapu-Lapu Shrine) marks the site of the Battle of Mactan on April 27, 1521, where Datu Lapu-Lapu and his warriors defeated Ferdinand Magellan. It features a bronze statue of Lapu-Lapu and a smaller statue of Magellan.',
 'Lapu-Lapu City','Magellan Drive, Punta Engaño, Lapu-Lapu City',10.28330000,124.00000000,
 '["https://images.unsplash.com/photo-1564507004-7b2e8d891d48?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1548611635-a2d5df3a79e3?auto=format&fit=crop&w=800&q=80"]',
 '{"mon":"8:00 AM - 5:00 PM","tue":"8:00 AM - 5:00 PM","wed":"8:00 AM - 5:00 PM","thu":"8:00 AM - 5:00 PM","fri":"8:00 AM - 5:00 PM","sat":"8:00 AM - 5:00 PM","sun":"8:00 AM - 5:00 PM"}',
 0.00,'{"phone":"+63-32-340-5000"}',
 'safe','moderate','[]',
 '{"hospitals":[{"name":"Lapu-Lapu City Hospital","phone":"(032) 340-5050","distance":"2km"}],"police":[{"name":"Lapu-Lapu City Police Office","phone":"(032) 340-5060","distance":"1km"}],"fire":[{"name":"Lapu-Lapu BFP Station","phone":"(032) 340-5070","distance":"1.5km"}]}',
 4.50,1100,9200,3400,'published','6142a515-fa95-4bac-adbb-454c7fc3719a',NOW(),NOW());


-- ─── ADVISORIES ───────────────────────────────────────────────────────────────

INSERT INTO `advisories`
  (`id`,`title`,`description`,`severity`,`source`,`affected_area`,
   `recommended_actions`,`start_date`,`end_date`,`status`,
   `notification_sent`,`acknowledged_by`,`created_by`,`created_at`,`updated_at`)
VALUES

('e0eed6d5-282d-4384-9035-b47b8c20b04b',
 'Typhoon Preparedness Alert — Southwest Cebu',
 'Tropical Storm Isang is expected to make landfall near the southwestern coast of Cebu within the next 24-48 hours. Signal No. 2 has been raised for the municipalities of Badian, Moalboal, Alcantara, and Ronda. Expect strong winds and heavy rainfall. All outdoor activities including canyoneering and beach swimming are suspended.',
 'critical','pagasa','{"type":"attractions","attractionIds":[]}',
 '1. Stay indoors and away from windows.\n2. Prepare emergency bags with essentials (water, food, medicine, documents).\n3. Avoid beaches, rivers, and mountain trails.\n4. Monitor PAGASA updates at pagasa.dost.gov.ph.\n5. Contact CDRRMO Cebu at (032) 255-3068 if you need evacuation assistance.',
 NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY),
 'active',1,'[]','d3c659df-5a9f-4d0c-9166-9903fc7fe192',NOW(),NOW()),

('26b4ca37-4d41-4a0a-8b1d-8784dc291a6b',
 'Strong Ocean Currents Warning — Moalboal & Pescador Island',
 'The Philippine Coast Guard has issued a warning for strong underwater currents in the Moalboal dive area and around Pescador Island. Three divers reported being caught in strong currents last weekend. All diving activities should be accompanied by a certified dive master.',
 'warning','lgu','{"type":"attractions","attractionIds":[]}',
 '1. Dive only with certified local dive guides.\n2. Do not dive alone or snorkel far from shore.\n3. Check current conditions before entering the water.\n4. Have a surface marker buoy (SMB) at all times.',
 NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY),
 'active',1,'[]','d3c659df-5a9f-4d0c-9166-9903fc7fe192',NOW(),NOW()),

('ba56a80c-32c1-4dde-ac85-7ca3f592b0bc',
 'Sinulog Festival — Crowd & Traffic Advisory',
 'The annual Sinulog Festival Grand Parade will be held in Cebu City on the third Sunday of January. Expect heavy foot traffic and road closures around the Cebu City Sports Center, Basilica del Santo Niño, and Colon Street. Extra police deployment will be in place.',
 'advisory','lgu','{"type":"attractions","attractionIds":[]}',
 '1. Use public transportation or ride-share instead of private vehicles.\n2. Keep valuables secure — pickpocketing incidents increase during festivals.\n3. Stay with your group and designate a meeting point.\n4. Carry enough water and sun protection.\n5. Emergency medical stations are set up at the Sports Center.',
 NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY),
 'active',1,'[]','d3c659df-5a9f-4d0c-9166-9903fc7fe192',NOW(),NOW());


-- ─── INCIDENTS ────────────────────────────────────────────────────────────────

INSERT INTO `incidents`
  (`id`,`type`,`description`,`latitude`,`longitude`,`nearest_landmark`,
   `reported_by`,`reporter_contact`,`status`,`assigned_to`,`responder_notes`,
   `attachments`,`resolved_at`,`created_at`,`updated_at`)
VALUES

('9d3c388f-8c80-49c5-baa3-eb9d53cacea5',
 'medical',
 'Tourist suffered ankle injury after slipping on wet rocks near the second level of Kawasan Falls. Mild sprain, required first aid. Transported to Badian District Hospital via habal-habal.',
 9.81670000,123.38330000,'Kawasan Falls, Badian',
 '021220dc-0a78-4643-b1f3-ab30d1aa14b0','+82-10-1234-5678',
 'resolved','Badian District Hospital / Badian BFP Rescue Team',
 'Patient treated and discharged. Recommended rest for 3-5 days.',
 '[]', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW()),

('8844c244-f531-4195-bfe6-c80cba63134f',
 'crime',
 'Tourist reported having mobile phone stolen at Carbon Market. Incident occurred near the dried fish stalls. Tourist was shopping alone when the phone was grabbed by an unidentified male on a motorcycle.',
 10.29470000,123.89960000,'Carbon Market — Dried Fish Section',
 '2b8bd5e7-308b-4079-b6d4-0d036d328c9e','+1-310-555-0199',
 'in_progress','Cebu City Police Station — Anti-Snatching Unit',
 'CCTV footage being reviewed. Case blotter filed under Report No. 2025-CC-0342.',
 '[]', NULL, NOW(), NOW()),

('c07e43f2-8147-4b7a-b53a-657505c5b1ad',
 'lost_person',
 'Korean tourist separated from trekking group near the summit of Osmeña Peak. Last seen wearing a red jacket. The group had 8 members; one did not return to the van at the designated time.',
 9.76470000,123.54690000,'Osmeña Peak Summit Trail, Dalaguete',
 '021220dc-0a78-4643-b1f3-ab30d1aa14b0','+82-10-9876-5432',
 'resolved','Dalaguete Search and Rescue Team / Dalaguete Police',
 'Tourist found safe after 2 hours, had taken a wrong trail. Reunited with group at 4:30 PM.',
 '[]', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), NOW());


SET FOREIGN_KEY_CHECKS = 1;

-- ─── SUMMARY ──────────────────────────────────────────────────────────────────
-- Records inserted:
--   users       : 9  (3 admins + 6 tourists)
--   attractions : 10
--   advisories  : 3
--   incidents   : 3
--
-- Admin credentials:
--   superadmin@cebusafetour.ph   /  SuperAdmin@123
--   content@cebusafetour.ph      /  Content@123
--   emergency@cebusafetour.ph    /  Emergency@123
--
-- Tourist password (all): Tourist@123
