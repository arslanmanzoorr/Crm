-- When the lead plans to buy, sell or move: drives who surfaces on Today and how the agent prioritizes.
alter table contacts add column move_by text check (move_by in ('asap', '1-3', '3-6', '6-12', '12+'));
