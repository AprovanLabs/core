#!/bin/bash

domains=($@)

for domain in "${domains[@]}"; do
  result=$(whois "${domain}.com" 2>&1)
  if echo "$result" | grep -qi "No match\|NOT FOUND\|No Data Found\|Domain not found"; then
    echo "✅ ${domain}.com - AVAILABLE"
  else
    echo "❌ ${domain}.com - taken"
  fi
  sleep 1
done
