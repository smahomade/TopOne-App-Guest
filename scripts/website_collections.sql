-- The salon website's collection photos (topone.co.uk/collection, from the
-- website repo's src/data/collections, 2026-11-23) as one app bundle per year.
-- The photos were already in the `collection` storage bucket under the same
-- names. Behind-the-scenes photos aren't included. created_at only sets the
-- order inside a bundle (the website's order); the 3 photos already in the
-- 2021 bundle keep their rows and move to their place in that order.

begin;

update public.collections set created_at = timestamptz '2026-11-23 12:00:00+00' + interval '1 second' * 14 where image_url = 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-white-blonde-bob-7.jpg';
update public.collections set created_at = timestamptz '2026-11-23 12:00:00+00' + interval '1 second' * 23 where image_url = 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/White-blonde-short-messy-cut-2.jpg';
update public.collections set created_at = timestamptz '2026-11-23 12:00:00+00' + interval '1 second' * 26 where image_url = 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Blonde-Highlights-Men-2.jpg';

insert into public.collections (title, year, category, image_url, sort_order, subtitle, show_year, created_at)
select v.title, v.year, v.category, v.image_url, v.sort_order, '', true, timestamptz '2026-11-23 12:00:00+00' + interval '1 second' * v.position
from (values
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Choppy-short-bob-with-purple-highlights-6.jpg', 1, 1),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Choppy-short-bob-with-purple-highlights-4.jpg', 1, 2),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Choppy-short-bob-with-purple-highlights-3.jpg', 1, 3),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Choppy-short-bob-with-purple-highlights-2.jpg', 1, 4),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Choppy-Short-bob-with-purple-highlights.jpg', 1, 5),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-highlights-with-movement-2.jpg', 1, 6),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-highlights-with-movement.jpg', 1, 7),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Black-blue-highlights-model-6.jpg', 1, 8),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Black-blue-highlights-model-5.jpg', 1, 9),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Black-blue-highlights-model-4.jpg', 1, 10),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Black-blue-highlights-model-3.jpg', 1, 11),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Black-blue-highlightt-model-2.jpg', 1, 12),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Black-Blue-highlights-Model.jpg', 1, 13),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-white-blonde-bob-6.jpg', 1, 15),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-white-blonde-bob-5.jpg', 1, 16),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-white-blonde-bob-4.jpg', 1, 17),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-white-blonde-bob-3.jpg', 1, 18),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-white-blonde-bob-2.jpg', 1, 19),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-White-Blonde-Bob.jpg', 1, 20),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/White-blonde-short-messy-cut-4.jpg', 1, 21),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/White-blonde-short-messy-cut-3.jpg', 1, 22),
  ('2021', 2021, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/White-Blonde-Short-Messy-Cut.jpg', 1, 24),
  ('2021', 2021, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Blonde-Highlights-Men-3.jpg', 1, 25),
  ('2021', 2021, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Blonde-Highlights-Men.jpg', 1, 27),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Messy-Short-Pixie-Cut-White-%26-Purple.jpg', 2, 28),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Messy-Short-Pixie-Cut-white-%26-Purple-2.jpg', 2, 29),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Messy-Short-Pixie-Cut-white%26purple-3.jpg', 2, 30),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Brown-Messy-bob.jpg', 2, 31),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Brown-Messy-Bob-3.jpg', 2, 32),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Brown-Messy-Bob-2.jpg', 2, 33),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde%26Pink-Highlights-Model-4.jpg', 2, 34),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde%26Pink-Highlights-Model-3.jpg', 2, 35),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-%26-Pink-Highlights-Model-2.jpg', 2, 36),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde%26Pink-Highlights-Model.jpg', 2, 37),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Long-Hair-Model-2.jpg', 2, 38),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Long-Hair-Model.jpg', 2, 39),
  ('2019', 2019, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Brown-Line-Bob-Model.jpg', 2, 40),
  ('2019', 2019, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Men-Haircut-Short-Black-%26-Blue-2.jpg', 2, 41),
  ('2019', 2019, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Men-Haircut-Short-Black-%26-Blue.jpg', 2, 42),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Ginger-Short-Bob-Model-4.jpg', 3, 43),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/GingershortBobModel-3.jpg', 3, 44),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Ginger-Short-Bob-Model-2.jpg', 3, 45),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Ginger-Short-Bob-Model.jpg', 3, 46),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Brunette-Long-hair.jpg', 3, 47),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Graduated-Back-Bob-3.jpg', 3, 48),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Graduated-back-Bob-2.jpg', 3, 49),
  ('2018', 2018, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde-Graduated-Back-Bob.jpg', 3, 50),
  ('2018', 2018, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Men-Curly-Brown-hair-4.jpg', 3, 51),
  ('2018', 2018, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Men-brown-hair-3.jpg', 3, 52),
  ('2018', 2018, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Men-brown-Hair-2.jpg', 3, 53),
  ('2018', 2018, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Men-Curly-Brown-Hair.jpg', 3, 54),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Blonde-straight-bob-3.jpg', 4, 55),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Blonde-straight-bob-2.jpg', 4, 56),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Blonde-straight-Bob.jpg', 4, 57),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Caramel-Brown-Graduated-Bob-3.jpg', 4, 58),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Caramel-Brown-Graduated-Bob-2.jpg', 4, 59),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Caramel-Brown-Graduated-Bob.jpg', 4, 60),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Bob-Black-hair-2.jpg', 4, 61),
  ('2017', 2017, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Short-Bob-black-hair.jpg', 4, 62),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Curly-blue-highlights-model-2.jpg', 5, 63),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Curly-Blue-highlights-model-3.jpg', 5, 64),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Curly-blue-highlights-model.jpg', 5, 65),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Copper-ginger-curly-long-hair.jpg', 5, 66),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Copper-ginger-long-hair.jpg', 5, 67),
  ('2016', 2016, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Brunnete_%20male_%20with_%20short_hair.jpg', 5, 68),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Long-black-hair-with-bangs.jpg', 5, 69),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Straight-Blonde-hair-with-Fringe.jpg', 5, 70),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Red-Short-bob-haircut-model-2.jpg', 5, 71),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Red-short-bob-haircut.jpg', 5, 72),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Feather-Blonde-haircut.jpg', 5, 73),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Straight-Blonde-Hair-2.jpg', 5, 74),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Straight-Blonde-Hair.jpg', 5, 75),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Orange-Pink-short-hair-model.jpg', 5, 76),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Orange-pink-short-hair-model-2.jpg', 5, 77),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Pink-blonde-hair-model.jpg', 5, 78),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Redhair-with-fringe-model.jpg', 5, 79),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Dark-blue-short-hair-model-2.jpg', 5, 80),
  ('2016', 2016, 'ladies', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Dark-blue-short-hair-model.jpg', 5, 81),
  ('2016', 2016, 'mens', 'https://unqumatnqfczxpsrbkmz.supabase.co/storage/v1/object/public/collection/Blonde_male_with_short_hair.jpg', 5, 82)
) as v(title, year, category, image_url, sort_order, position);

commit;
