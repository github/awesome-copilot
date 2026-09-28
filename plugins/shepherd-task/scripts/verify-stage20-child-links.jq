def positive_integral_number:
  type == "number" and . > 0 and floor == .;

def unique_ids:
  (map(.id) | unique | length) == length;

if ($baseline | length) != 1 or ($baseline[0] | type) != "array" then
  error("pre-creation child snapshot root must be a JSON array")
elif ($final | length) != 1 or ($final[0] | type) != "array" then
  error("final child snapshot root must be a JSON array")
elif ($ledger | length) != 1 or ($ledger[0] | type) != "array" then
  error("creation ledger root must be a JSON array")
else
  $baseline[0] as $baseline_entries |
  $final[0] as $final_entries |
  $ledger[0] as $ledger_entries |
  if all($baseline_entries[]; type == "object" and (.id | positive_integral_number)) | not then
    error("pre-creation child snapshot contains an invalid issue identity")
  elif all($final_entries[]; type == "object" and (.id | positive_integral_number)) | not then
    error("final child snapshot contains an invalid issue identity")
  elif ($ledger_entries | length) == 0 then
    error("creation ledger must contain at least one issue")
  elif all($ledger_entries[]; type == "object" and (.id | positive_integral_number)) | not then
    error("creation ledger contains an invalid issue identity")
  elif ($baseline_entries | unique_ids) | not then
    error("pre-creation child snapshot contains duplicate issue identities")
  elif ($final_entries | unique_ids) | not then
    error("final child snapshot contains duplicate issue identities")
  elif ($ledger_entries | unique_ids) | not then
    error("creation ledger contains duplicate issue identities")
  else
    ($baseline_entries | map(.id)) as $baseline_ids |
    ($ledger_entries | map(.id)) as $ledger_ids |
    ($final_entries | map(.id)) as $final_ids |
    ([
      $final_entries[] |
      .id as $id |
      select(($baseline_ids | index($id)) == null) |
      $id
    ]) as $new_ids |
    if ($final_entries | length) != (($baseline_entries | length) + ($ledger_entries | length)) then
      error("final child count does not equal the baseline count plus the creation ledger count")
    elif all($baseline_ids[]; . as $id | ([$final_ids[] | select(. == $id)] | length) == 1) | not then
      error("one or more pre-creation child identities are missing from the final snapshot")
    elif all($ledger_ids[]; . as $id | ([$final_ids[] | select(. == $id)] | length) == 1) | not then
      error("one or more creation-ledger identities are not linked exactly once")
    elif $new_ids != $ledger_ids then
      error("newly linked child identities do not match creation-ledger order")
    else
      {
        baselineCount: ($baseline_entries | length),
        ledgerCount: ($ledger_entries | length),
        finalCount: ($final_entries | length),
        newIssueIds: $new_ids
      }
    end
  end
end
