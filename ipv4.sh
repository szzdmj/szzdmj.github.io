#!ipv4 No. 10
array=()
           while read line; do
            array+=("$line")
           done < 4.txt
           echo 原ipv4数组的顺序为：${array[@]}
            new_arr=()
            for item in "${array[@]}"; do
              if `curl -s --connect-timeout 1.2 --max-time 1.5 http://"$item"/robots.txt >/dev/null` ; then
               echo "$item" && new_arr+=($item)
               echo "$item" && new_arr+=(`jq -n --arg KEY 'Value' '{"\($KEY)":$item}'`)
              fi
            done 
 # Fetch the data
s=$(echo ${new_arr[@]}| jq -Rn 'inputs | split("\\s+"; "g") | reverse | select(length > 0 and .[0] != "")' | jq -r .[])

# Convert the data into an array for easier manipulation
records=($s)

# Randomly shuffle the array
shuffled_records=($(shuf -e "${records[@]}"))

# Select 10 records (you can change the number 100 to any number that fits within the character limit)
selected_records=("${shuffled_records[@]:0:10}")

# Create a JSON structure for the selected records
json_records=""
for record in "${selected_records[@]}"; do
  json_records+='{"Value":"'"$record"'"},'  # Add the record to the JSON structure
done

# Remove the trailing comma
json_records=${json_records::-1}

# Construct the final JSON for the change batch
change_request='{"Comment":"CREATE/DELETE/UPDATE","Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"a.szzd.org","Type":"A","TTL":300,"ResourceRecords":['$json_records']}}]}'

# Output the request (you can save it to a file or send it via API)
echo $change_request > a.txt
          