import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUserStats } from "@/components/admin/AdminUserStats";

const mocks=vi.hoisted(()=>({send:vi.fn()}));
vi.mock('@/lib/pocketbase',()=>({pb:{send:mocks.send}}));
vi.mock('@/pages/AnalyticsPage',()=>({default:({adminUserId}:{adminUserId:string})=><div>Analytics subject: {adminUserId}</div>}));
vi.mock('recharts',()=>Object.fromEntries(['Area','AreaChart','CartesianGrid','ResponsiveContainer','Tooltip','XAxis','YAxis'].map(name=>[name,()=>null])));
const summary={before:150,after:12500,unique:10000,resources:1,trend:[{date:'2026-09-01',clicks:12500}],countries:[{name:'US',clicks:12500}],estimated:true,geographyEstimated:true};
const options={links:[{id:'link00000000001',name:'Campaign',slug:'campaign'}],profiles:[],history:[]};
beforeEach(()=>{
  mocks.send.mockReset();
  mocks.send.mockImplementation(async (path:string)=>path.endsWith('/preview')?{id:'preview123',summary,expiresAt:'2026-09-05T12:15:00Z'}:path.endsWith('/apply')?{ok:true}:options);
});
afterEach(cleanup);
const setup = async () => {
  render(<AdminUserStats userId="user00000000001" />);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Adjust statistics'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Adjust statistics'}));
  fireEvent.change(screen.getByLabelText('Final total in this range'),{target:{value:'12500'}});
  fireEvent.change(screen.getByLabelText('Internal reason · admin history only'),{target:{value:'Verified ingestion gap in this campaign.'}});
  fireEvent.click(screen.getByRole('button',{name:'Preview adjustment'}));
  await screen.findByRole('button',{name:'Apply adjustment'});
};
describe('admin user statistics editor',()=>{
  it('uses an explicit preview, confirmation, and owner-scoped apply',async()=>{
    await setup();
    expect(screen.getByText('Analytics subject: user00000000001')).toBeInTheDocument();
    const call=mocks.send.mock.calls.find(([path])=>String(path).endsWith('/preview'));
    expect(call![1].body).toMatchObject({total:12500,uniquePercent:80,mode:'links',resourceId:'all'});
    fireEvent.click(screen.getByRole('button',{name:'Apply adjustment'}));
    expect(mocks.send.mock.calls.some(([path])=>String(path).endsWith('/apply'))).toBe(false);
    await act(async()=>{ fireEvent.click(screen.getByRole('button',{name:'Confirm adjustment'})); });
    expect(mocks.send).toHaveBeenCalledWith('/api/admin/users/user00000000001/stats/preview123/apply',expect.objectContaining({method:'POST'}));
    expect(screen.getByRole('status')).toHaveTextContent('Adjustment applied');
  });
  it('invalidates the preview when any input changes',async()=>{
    await setup();
    fireEvent.change(screen.getByLabelText('Unique share · %'),{target:{value:'81'}});
    expect(screen.queryByRole('button',{name:'Apply adjustment'})).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Preview adjustment'})).toBeEnabled();
  });
  it('shows actionable backend errors and never silently claims success',async()=>{
    await setup();
    mocks.send.mockImplementation(async(path:string)=>{if(path.endsWith('/apply'))throw {response:{message:'Traffic changed after this preview. Generate a fresh preview.'}};return options;});
    fireEvent.click(screen.getByRole('button',{name:'Apply adjustment'}));
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Confirm adjustment'}));});
    expect(screen.getByRole('alert')).toHaveTextContent('Generate a fresh preview');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
