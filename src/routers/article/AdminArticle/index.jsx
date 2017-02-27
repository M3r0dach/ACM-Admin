import React, { PropTypes } from 'react';
import { connect } from 'dva';
import { routerRedux, Link } from 'dva/router';
import {
  Table, Button, Popconfirm, Modal, Dropdown,
  Icon, Menu, Tag
} from 'antd';
import marked from 'marked';
import Highlight from 'react-highlight';
import StatusPoint from 'components/StatusPoint';
import SearchInput from 'components/SearchInput';
import { ArticleStatus } from 'models/article';
import './style.less';

const MenuItem = Menu.Item;

const renderOperationsByArticle = (record, operations) => {
  const publishItem = (
    <MenuItem key="publish">
      <Link onClick={() => operations.onChangeStatus(record, ArticleStatus.PUBLISH)}>发布</Link>
    </MenuItem>
  );
  const topItem = (
    <MenuItem key="top">
      <Link onClick={() => operations.onChangeStatus(record, ArticleStatus.PINNED)}>置顶</Link>
    </MenuItem>
  );
  const unTopItem = (
    <MenuItem key="unTop">
      <Link onClick={() => operations.onChangeStatus(record, ArticleStatus.PUBLISH)}>取消置顶</Link>
    </MenuItem>
  );
  const draftItem = (
    <MenuItem key="draft">
      <Link onClick={() => operations.onChangeStatus(record, ArticleStatus.DRAFT)}>移到草稿箱</Link>
    </MenuItem>
  );
  let items = [];
  switch (record.status) {
    case ArticleStatus.RECYCLE:
      items = [draftItem, publishItem, topItem];
      break;
    case ArticleStatus.DRAFT:
      items = [publishItem, topItem];
      break;
    case ArticleStatus.PUBLISH:
      items = [draftItem, topItem];
      break;
    case ArticleStatus.PINNED:
      items = [unTopItem, draftItem];
      break;
    default:
      break;
  }
  return <Menu>{items}</Menu>;
};

const getColumns = (filters, operations) => (
  [{
    title: '标题',
    dataIndex: 'title',
    sorter: true,
    width: '20%',
    render: title => <b>{title}</b>
  }, {
    title: '状态',
    dataIndex: 'status',
    width: '10%',
    filters: [
      { text: '回收站', value: ArticleStatus.RECYCLE },
      { text: '草稿', value: ArticleStatus.DRAFT },
      { text: '发布', value: ArticleStatus.PUBLISH },
      { text: '置顶', value: ArticleStatus.PINNED }
    ],
    filteredValue: filters.status || [],
    render: status => {
      switch (status) {
        case ArticleStatus.RECYCLE:
          return <StatusPoint color="gray">回收站</StatusPoint>;
        case ArticleStatus.DRAFT:
          return <StatusPoint color="light-blue">草稿</StatusPoint>;
        case ArticleStatus.PUBLISH:
          return <StatusPoint color="green">发布</StatusPoint>;
        case ArticleStatus.PINNED:
          return <StatusPoint color="red">置顶</StatusPoint>;
        default:
          return null;
      }
    }
  }, {
    title: '作者',
    dataIndex: 'user.name',
    width: '8%',
  }, {
    title: '更新时间',
    dataIndex: 'updated_at',
    sorter: true,
    width: '18%'
  }, {
    title: '创建时间',
    dataIndex: 'created_at',
    sorter: true,
    width: '18%'
  }, {
    title: '操作',
    key: 'operation',
    render: (text, record) => {
      const editOp = <Link to={`/admin/articles/edit/${record.id}`}>修改</Link>;
      return (
        <span>
          {editOp}
          <span className="ant-divider" />
          <Popconfirm
            title="确定要删除吗？" placement="left"
            onConfirm={() => operations.onDelete(record)}
          >
            <a>删除</a>
          </Popconfirm>
          <span className="ant-divider" />
          <a onClick={e => operations.onPreview(e, record)}>预览</a>
          <span className="ant-divider" />
          <Dropdown
            overlay={renderOperationsByArticle(record, operations)}
            trigger={['click']}
          >
            <a className="ant-dropdown-link">
              其它操作 <Icon type="down" />
            </a>
          </Dropdown>
        </span>
      );
    }
      ,
  }]
);

class AdminArticle extends React.PureComponent {
  static propTypes = {
    location: PropTypes.object,
    dispatch: PropTypes.func,
    loading: PropTypes.bool,
    list: PropTypes.array,
    type: PropTypes.string,
    filters: PropTypes.object,
    pagination: PropTypes.object,
  }

  constructor(props) {
    super(props);
    this.state = {
      showPreviewModal: false,
      activeRecord: null,
    };
    this.handleTableChange = this.handleTableChange.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onPreview = this.onPreview.bind(this);
    this.onChangeStatus = this.onChangeStatus.bind(this);
  }

  onDelete(record) {
    this.props.dispatch({ type: 'article/delete', payload: record.id });
  }

  onSearch(value) {
    this.props.dispatch(routerRedux.push({
      pathname: `/admin/articles/${this.props.type}`,
      query: { ...this.props.location.query, search: value }
    }));
  }

  onChangeStatus(record, status) {
    this.props.dispatch({
      type: 'article/changeStatus',
      payload: {
        id: record.id,
        params: { status }
      }
    });
  }

  onPreview(e, record) {
    e.preventDefault();
    this.setState({ showPreviewModal: true, activeRecord: record });
  }

  handleTableChange(pagination, filters, sorter) {
    const params = {
      page: pagination.current,
      filters: JSON.stringify(filters)
    };
    if (sorter && sorter.field) {
      params.sortField = sorter.field;
      params.sortOrder = sorter.order;
    }
    this.props.dispatch(routerRedux.push({
      pathname: `/admin/articles/${this.props.type}`,
      query: { ...this.props.location.query, ...params }
    }));
  }

  render() {
    const columns = getColumns(this.props.filters, {
      onDelete: this.onDelete,
      onPreview: this.onPreview,
      onChangeStatus: this.onChangeStatus
    });
    const { showPreviewModal, activeRecord } = this.state;
    return (
      <div>
        <div className="table-operations clear-fix">
          {this.props.type === 'news' ? (
            <Button type="primary" >
              <Link to="/admin/articles/news/create">发布新闻</Link>
            </Button>
          ) : null}
          <div className="pull-right">
            <SearchInput onSearch={this.onSearch} style={{ width: 200 }} />
          </div>
        </div>
        <Table
          bordered
          onChange={this.handleTableChange}
          rowKey={record => record.id}
          columns={columns} dataSource={this.props.list}
          pagination={this.props.pagination} loading={this.props.loading}
        />
        <Modal
          closable maskClosable title="预览"
          visible={showPreviewModal} footer={null}
          style={{ top: 20 }} width={640}
          onCancel={() => this.setState({ showPreviewModal: false })}
        >
          {activeRecord ? (
            <div>
              <div className="tags-line">
                <b>标签:</b>
                {activeRecord.tags.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
              </div>
              <hr />
              <Highlight className="article-preview" innerHTML>
                {marked(activeRecord.content)}
              </Highlight>
            </div>
          ) : null}
        </Modal>
      </div>
    );
  }
}

const mapStateToProps = ({ loading, article }) => ({
  loading: loading.models.article,
  list: article.list,
  type: article.type,
  filters: article.filters,
  pagination: {
    current: article.page,
    pageSize: article.per,
    total: article.totalCount
  }
});

export default connect(mapStateToProps)(AdminArticle);