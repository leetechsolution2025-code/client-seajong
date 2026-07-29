with open('src/components/logistics/inventory/LogisticsAuditLogs.tsx', 'r') as f:
    content = f.read()

content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  const [page, setPage] = useState(1);\n  const [totalPages, setTotalPages] = useState(1);')

with open('src/components/logistics/inventory/LogisticsAuditLogs.tsx', 'w') as f:
    f.write(content)
