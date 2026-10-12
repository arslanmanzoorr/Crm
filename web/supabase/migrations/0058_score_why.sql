-- Explainable scoring: the AI's short reason for the lead's score, shown next to it.
alter table contacts add column score_why text not null default '' check (length(score_why) <= 400);
