const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

// The block ends currently with:
//   1784                           <textarea className="form-control rounded-3" rows={3} placeholder="Nhập mục tiêu khác..."></textarea>
//   1785                         </div>
//   1786                       </div>
//   1787                   </div>
//
//   1788
//   1789                   {/* CHIẾN LƯỢC HÀNH ĐỘNG */}

code = code.replace(
`                          <textarea className="form-control rounded-3" rows={3} placeholder="Nhập mục tiêu khác..."></textarea>
                        </div>
                      </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`,
`                          <textarea className="form-control rounded-3" rows={3} placeholder="Nhập mục tiêu khác..."></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`
);

fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
console.log("Fixed missing div tag");
